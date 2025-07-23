//% color="#deae10" weight=100
namespace AirBitRemote {
    interface Controls {
        throttle: number,
        pitch: number,
        roll: number,
        yaw: number
    }

    let controls: Controls = {
        throttle: 0,
        pitch: 0,
        roll: 0,
        yaw: 0
    };

    let estop: boolean = false;

    //% block
    export function initialise() {
        controls = {
            throttle: 0,
            pitch: 0,
            roll: 0,
            yaw: 0
        }
    }

    //% block
    export function connectToChannel(channel: number) {
        radio.setGroup(channel);
    }

    //% block
    export function emergencyStop() {
        radio.sendString("e");
        estop = true;
    }

    //% block
    export function setThrottle(amount: number) {
        controls.throttle = Math.min(Math.max(amount, 0), 100);
    }

    //% block
    export function setPitch(amount: number) {
        controls.pitch = Math.min(Math.max(amount, -45), 45);
    }

    //% block
    export function setRoll(amount: number) {
        controls.roll = Math.min(Math.max(amount, -45), 45);
    }

    //% block
    export function setYaw(amount: number) {
        controls.yaw = amount;
    }

    //% block
    export function changeThrottle(amount: number) {
        controls.throttle = Math.min(Math.max(controls.throttle + amount, 0), 100);
    }

    //% block
    export function changePitch(amount: number) {
        controls.pitch = Math.min(Math.max(controls.pitch + amount, -45), 45);
    }

    //% block
    export function changeRoll(amount: number) {
        controls.roll = Math.min(Math.max(controls.roll + amount, -45), 45);
    }

    //% block
    export function changeYaw(amount: number) {
        controls.roll += amount;
    }

    //% block
    export function arm() {
        radio.sendString('a');
    }

    //% block
    export function disarm() {
        radio.sendString('d');
    }

    //% block
    export function sendControls() {
        if (estop) return;

        radio.sendValue('t', controls.throttle);
        radio.sendValue('p', controls.pitch);
        radio.sendValue('r', controls.roll);
        radio.sendValue('y', controls.yaw);
    }
}