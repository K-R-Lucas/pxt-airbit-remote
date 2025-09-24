const deg = 180.0 / Math.PI;

class Vector3 {
    x = 0;
    y = 0;
    z = 0;

    constructor(x: number, y: number, z: number) {
        x = x;
        y = y;
        z = z;
    }

    add(v: Vector3) {
        return new Vector3(
            this.x + v.x, this.y + v.y, this.z + v.z
        );
    }

    sub(v: Vector3) {
        return new Vector3(
            this.x - v.x, this.y - v.x, this.z - v.z
        );
    }

    mul(v: Vector3) {
        return new Vector3(
            this.x*v.x, this.y*v.y, this.z*v.z
        );
    }

    scale(v: number) {
        return new Vector3(
            this.x*v, this.y*v, this.z*v
        );
    }

    div(v: Vector3) {
        return new Vector3(
            this.x/v.x, this.y/v.y, this.z/v.z
        );
    }

    iAdd(v: Vector3) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }

    iSub(v: Vector3) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
    }

    iMul(v: Vector3) {
        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
    }

    iScale(v: number) {
        this.x *= v;
        this.y *= v;
        this.z *= v;
    }

    iDiv(v: Vector3) {
        this.x /= v.x;
        this.y /= v.y;
        this.z /= v.z;
    }

    copy() {
        return new Vector3(this.x, this.y, this.z);
    }

    set(v: Vector3) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
    }
}

function as_uint32(v: number): number {
    let buf = pins.createBuffer(4);
    buf.setNumber(NumberFormat.Float32BE, 0, v);
    return buf.getNumber(NumberFormat.UInt32BE, 0);
}

function as_float32(v: number): number {
    let buf = pins.createBuffer(4);
    buf.setNumber(NumberFormat.UInt32BE, 0, v);
    return buf.getNumber(NumberFormat.Float32BE, 0);
}

function f16_to_f32(x: number): number {
    let e = Math.trunc((x & 0x7C00) >> 10);
    let m = Math.trunc((x & 0x03FF) << 13);
    let v = Math.trunc(as_uint32(x) >> 23);

    return as_float32(
        (x & 0x8000) << 16 | (+(e != 0)) * ((e + 112) << 23 | m)
                           | ((+(e == 0)) & (+(m != 0))) * (
                                (v - 32) << 23 | ((m << (150 - v)) & 0x007FE000)
                           ));
}

function f32_to_f16(x: number): number {
    let b = Math.trunc(as_uint32(x) + 0x00001000);
    let e = Math.trunc((b & 0x7F800000) >> 23);
    let m = Math.trunc(b & 0x007FFFFF);

    return (b & 0x80000000) >> 16 | (+(e > 112)) * ((((e - 112) << 10) & 0x7C00) | m >> 13)
                                  | ((+(e < 113)) & (+(e > 101))) * ((((0x007FF000 + m) >> (125 - e)) + 1) >> 1)
                                  | (+(e > 143)) * 0x7FFF;

}

enum TelemetryValues {
    pitch = 0,
    armed = 1,
    throttle = 2,
    roll = 3,
    yaw = 4,
    accX = 5,
    accY = 6,
    accZ = 7,
    estop = 8,
    crashed = 9,
    charging = 10,
    charged = 11,
    low_battery = 12
}

interface Telemetry {
    pitch: number,
    armed: Boolean,
    throttle: number,
    roll: number,
    yaw: number,
    accX: number,
    accY: number,
    accZ: number,
    estop: Boolean,
    crashed: Boolean,
    charging: Boolean,
    charged: Boolean,
    low_battery: Boolean
}

class State {
    throttle: number = 0;
    pitch: number = 0;
    roll: number = 0;
    yaw: number = 0;

    telemetry: Telemetry = {
        pitch: 0,
        armed: false,
        throttle: 0,
        roll: 0,
        yaw: 0,
        accX: 0,
        accY: 0,
        accZ: 0,
        estop: false,
        crashed: false,
        charging: false,
        charged: false,
        low_battery: false
    }

    armed: Boolean = false;
    estop: Boolean = false;

    acc: Vector3;
    packet: Buffer;

    constructor() {
        this.packet = pins.createBuffer(9);
        this.acc = new Vector3(0, 0, 0);
    }

    getPacket(): Buffer {
        this.packet.setUint8(0, +this.armed | +this.estop << 1)

        this.packet.setNumber(NumberFormat.UInt16BE, 1, f32_to_f16(this.throttle));
        this.packet.setNumber(NumberFormat.UInt16BE, 3, f32_to_f16(this.pitch));
        this.packet.setNumber(NumberFormat.UInt16BE, 5, f32_to_f16(this.roll));
        this.packet.setNumber(NumberFormat.UInt16BE, 7, f32_to_f16(this.yaw));

        return this.packet;
    }

    loadPacket(packet: Buffer) {
        let flags = packet.getUint8(0);

        let armed =                  !!(flags & 0b00000001);
        let estop =                  !!(flags & 0b00000010);
        this.telemetry.crashed =     !!(flags & 0b00000100);
        this.telemetry.charging =    !!(flags & 0b00001000);
        this.telemetry.charged =     !!(flags & 0b00010000);
        this.telemetry.low_battery = !!(flags & 0b00100000);
        
        this.telemetry.throttle = f16_to_f32(packet.getNumber(NumberFormat.UInt16BE, 1));
        this.telemetry.pitch =    f16_to_f32(packet.getNumber(NumberFormat.UInt16BE, 3));
        this.telemetry.roll =     f16_to_f32(packet.getNumber(NumberFormat.UInt16BE, 5));
        this.telemetry.yaw =      f16_to_f32(packet.getNumber(NumberFormat.UInt16BE, 7));

        this.estop = (this.estop && !estop) || (!this.estop && estop) || (this.estop && estop);
        this.armed = (this.armed && !armed) || (this.armed && armed);

        this.telemetry.estop = estop;
        this.telemetry.armed = armed;
    }
}

//% color="#deae10" weight=100 block="Air:Bit Remote"
namespace AirBitRemote {
    let state: State;
    let last: State;
    let acc_vector: Vector3 = new Vector3(0, 0, 0);
    let roll: number = 0;
    let pitch: number = 0;
    let plot_dot: boolean = false;

    //% block="showControlDot(visible$visible)"
    //% group="Telemetry"
    //% visible.defl=true
    export function showControlDot(visible: boolean) {
        plot_dot = visible;
    }

    //% block="calculateAngles()"
    //% group="Control"
    export function calculateAngles() {
        acc_vector.x = input.acceleration(Dimension.X);
        acc_vector.y = input.acceleration(Dimension.Y);
        acc_vector.z = input.acceleration(Dimension.Z);

        roll = Math.atan2(acc_vector.x, -acc_vector.z)*deg;
        pitch = Math.atan2(acc_vector.y, -acc_vector.z)*deg;

        if (plot_dot) {
            basic.clearScreen();
            led.plot(2 + Math.round(2*roll/45), 2 + Math.round(2*pitch/45));
        }
    }

    //% block="getControllerRoll()"
    //% group="Telemetry"
    export function getControllerRoll(): number {
        return roll;
    }

    //% block="getControllerPitch()"
    //% group="Telemetry"
    export function getControllerPitch(): number {
        return pitch;
    }

    //% block="init()"
    //% group="Setup"
    export function init() {
        state = new State();
        last = new State();
    }

    //% block="setWifiChannel($channel)"
    //% group="Setup"
    export function setWifiChannel(channel: number) {
        radio.setGroup(channel);
    }

    //% block="emergencyStop()"
    //% group="Control"
    export function emergencyStop() {
        state.estop = true;
    }

    //% block="setThrottle($amount)"
    //% group="Control"
    export function setThrottle(amount: number) {
        state.throttle = Math.min(Math.max(amount, 0), 100);
    }

    //% block="setPitch($amount)"
    //% group="Control"
    export function setPitch(amount: number) {
        state.pitch = Math.min(Math.max(amount, -45), 45);
    }

    //% block="setRoll($amount)"
    //% group="Control"
    export function setRoll(amount: number) {
        state.roll = Math.min(Math.max(amount, -45), 45);
    }

    //% block="setYaw($amount)"
    //% group="Control"
    export function setYaw(amount: number) {
        state.yaw = amount;
    }

    //% block="changeThrottle($amount)"
    //% group="Control"
    export function changeThrottle(amount: number) {
        state.throttle = Math.min(Math.max(state.throttle + amount, 0), 100);
    }

    //% block="changePitch($amount)"
    //% group="Control"
    export function changePitch(amount: number) {
        state.pitch = Math.min(Math.max(state.pitch + amount, -45), 45);
    }

    //% block="changeRoll($amount)"
    //% group="Control"
    export function changeRoll(amount: number) {
        state.roll = Math.min(Math.max(state.roll + amount, -45), 45);
    }

    //% block="changeYaw($amount)"
    //% group="Control"
    export function changeYaw(amount: number) {
        state.roll += amount;
    }

    //% block="arm()"
    //% group="Control"
    export function arm() {
        state.armed = true
    }

    //% block="disarm()"
    //% group="Control"
    export function disarm() {
        state.armed = false;
    }

    //% block="sendControls()"
    //% group="Control"
    export function sendControls() {
        let packet = state.getPacket();

        radio.sendBuffer(packet);
    }

    //% block="enableTelemetry($enabled)"
    //% group="Setup"
    export function enableTelemetry(enabled: Boolean) {
        if (enabled) {
            radio.onReceivedBuffer(state.loadPacket);
        } else {
            radio.onReceivedBuffer((buffer: Buffer) => {});
        }
    }

    //% block="readTelemetry($type)"
    //% group="Telemetry"
    export function readTelemetry(type: TelemetryValues): number | Boolean {
        switch (type) {
            case TelemetryValues.pitch:
                return state.telemetry.pitch;
            
            case TelemetryValues.armed:
                return state.telemetry.armed;
            
            case TelemetryValues.roll:
                return state.telemetry.roll;
            
            case TelemetryValues.throttle:
                return state.telemetry.throttle;
            
            case TelemetryValues.yaw:
                return state.telemetry.yaw;
            
            case TelemetryValues.accX:
                return state.telemetry.accX;
            
            case TelemetryValues.accY:
                return state.telemetry.accY;
            
            case TelemetryValues.accZ:
                return state.telemetry.accZ;
            
            case TelemetryValues.crashed:
                return state.telemetry.crashed;
            
            case TelemetryValues.charged:
                return state.telemetry.charged;
            
            case TelemetryValues.charging:
                return state.telemetry.charging;
            
            case TelemetryValues.low_battery:
                return state.telemetry.low_battery;
            
            case TelemetryValues.estop:
                return state.telemetry.estop;
        }
    }
}