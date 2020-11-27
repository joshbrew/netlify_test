import { elm } from '../util/util';
import { HEGwebAPI } from "./HEGwebAPI";

const encoder       = new TextEncoder();

const serviceUUID   = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const rxUUID        = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const txUUID        = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

export class HegConnection {

    private device: BluetoothDevice | null = null;
    private server: BluetoothRemoteGATTServer | null = null;
    private cmdChar: BluetoothRemoteGATTCharacteristic | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    private parentId = "main_body";
    private buttonId = "blebutton";

    constructor(private valueHandleFunction: (ev: Event) => any) {
        const HTMLtoAppend = '<button id="' + this.buttonId + '">BLE Connect</button>';
        HEGwebAPI.appendFragment(HTMLtoAppend, this.parentId);

        elm(this.buttonId).onclick = () => this.connect();
    }
 
    async connect() {
        this.device = await navigator.bluetooth.requestDevice({
            // acceptAllDevices: true
            filters: [{ namePrefix: 'HEG' }],
            optionalServices: [serviceUUID]
        });
        
        const btServer = await this.device.gatt?.connect();
        if (!btServer) throw 'no connection';
        this.server = btServer;

        const service = await this.server.getPrimaryService(serviceUUID);

        // Send command to start HEG automatically (if not already started)
        this.cmdChar = await service.getCharacteristic(rxUUID);
        
        this.characteristic = await service.getCharacteristic(txUUID);

        this.startReading();
    }

    async sendCommand(msg: string) {
        if (!this.cmdChar) {
            console.log("HEG not connected");
            throw "error";
        }

        await this.cmdChar.writeValue(encoder.encode(msg));
    }

    async disconnect() {
        await this.stopReading();
        this.server?.disconnect();
    }

    async startReading() {
        if (!this.characteristic) {
            console.log("HEG not connected");
            throw "error";
        }

        await this.sendCommand("o");
        await this.sendCommand("t");

        this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.handleValue);
    }

    async stopReading() {
        if (!this.characteristic) {
            console.log("HEG not connected");
            throw "error";
        }

        await this.sendCommand("f");

        this.characteristic.stopNotifications();
        this.characteristic.removeEventListener('characteristicvaluechanged', this.handleValue);
    }

    handleValue = (ev: Event) => this.valueHandleFunction(ev);
 
     async readDeviceAsync () {
        //  if (!this.characteristic) {
        //      console.log("HEG not connected");
        //      throw "error";
        //  }
 
        //  // await this.characteristic.startNotifications();
        //  this.doReadHeg = true;
         
        //  var data = ""
        //  while (this.doReadHeg) {
        //      const val = this.decoder.decode(await this.characteristic.readValue());
        //      if (val !== this.data) {
        //          data = val;
        //          console.log(data);
        //          //data = data[data.length - 1];
        //          //const arr = data.replace(/[\n\r]+/g, '')
        //          this.n ++;
        //          this.onReadAsyncCallback(data);
        //      }
        //  }
    }
}
