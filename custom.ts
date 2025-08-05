class State {
    throttle: number = 0;
    pitch: number = 0;
    roll: number = 0;
    yaw: number = 0;
    send_arm: boolean = false;
    send_disarm: boolean = false;
    send_estop: boolean = false;

    constructor() {}
}

//% color="#deae10" weight=100
namespace AirBitRemote {
    let state: State;
    let last: State;

    //% block="init()"
    //% group="Setup"
    export function init() {
        state = new State();
        last = new State();
    }

    //% block="setWifiChannel($channel)"
    //% group="Communication"
    export function setWifiChannel(channel: number) {
        radio.setGroup(channel);
    }

    //% block="emergencyStop()"
    //% group="Control"
    export function emergencyStop() {
        radio.sendString("e");
        state.send_estop = true;
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
        state.send_arm = true
    }

    //% block="disarm()"
    //% group="Control"
    export function disarm() {
        state.send_disarm = true;
    }

    //% block="sendControls()"
    //% group="Communication"
    export function sendControls() {
        if (state.send_estop) {
            radio.sendValue('e', 1);
            state.send_estop = false;
        }
        
        if (state.send_arm) {
            radio.sendValue('a', 1);
            state.send_arm = false;
        }

        if (state.send_disarm) {
            radio.sendValue('d', 1);
            state.send_disarm = false;
        }

        if (last.pitch != state.pitch) {
            radio.sendValue('p', state.pitch);
        }

        if (last.roll != state.roll) {
            radio.sendValue('r', state.roll);
        }

        if (last.throttle != state.throttle) {
            radio.sendValue('t', state.throttle);
        }

        if (last.yaw != state.yaw) {
            radio.sendValue('y', state.yaw);
        }

        last.throttle = state.throttle;
        last.pitch = state.pitch;
        last.roll = state.roll;
        last.yaw = state.yaw;
    }
}