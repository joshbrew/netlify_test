export class bleUtils { //This is formatted for the way the HEG sends/receives information. Other BLE devices will likely need changes to this to be interactive.
    constructor(async = false, serviceUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e', rxUUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e', txUUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e', defaultUI = false, parentId="main_body" , buttonId = "blebutton"){
     this.serviceUUID = serviceUUID;
     this.rxUUID      = rxUUID; //characteristic that can receive input from this device
     this.txUUID      = txUUID; //characteristic that can transmit input to this device
     this.encoder     = new TextEncoder("utf-8");
     this.decoder     = new TextDecoder("utf-8");
 
     this.device  = null;
     this.server  = null;
     this.service = null;
     this.rxchar  = null; //receiver on the BLE device (write to this)
     this.txchar  = null; //transmitter on the BLE device (read from this)
 
     this.parentId = parentId;
     this.buttonId = buttonId;
 
     this.async = async;
 
     this.android = navigator.userAgent.toLowerCase().indexOf("android") > -1; //Use fast mode on android (lower MTU throughput)
 
     this.n; //nsamples
 
     if(defaultUI = true){
       this.initUI(parentId, buttonId);
     }
     
    }
 
    initUI(parentId, buttonId) {
     if(this.device != null){
       if (this.device.gatt.connected) {
         this.device.gatt.disconnect();
         console.log("device disconnected")
       }
     }
     var HTMLtoAppend = '<button id="'+buttonId+'">BLE Connect</button>';
     HEGwebAPI.appendFragment(HTMLtoAppend,parentId);
     document.getElementById(buttonId).onclick = () => { 
       if(this.async === false) {
         this.initBLE();
       } 
       else{
         this.initBLEasync();
       } 
     }
    }
 
    //Typical web BLE calls
    initBLE = (serviceUUID = this.serviceUUID, rxUUID = this.rxUUID, txUUID = this.txUUID) => { //Must be run by button press or user-initiated call
     navigator.bluetooth.requestDevice({   
       acceptAllDevices: true,
       optionalServices: [serviceUUID] 
       })
       .then(device => {
           //document.getElementById("device").innerHTML += device.name+ "/"+ device.id +"/"+ device.gatt.connected+"<br>";
           this.device = device;
           return device.gatt.connect(); //Connect to HEG
       })
       .then(sleeper(100)).then(server => server.getPrimaryService(serviceUUID))
       .then(sleeper(100)).then(service => { 
         this.service = service;
         service.getCharacteristic(rxUUID).then(sleeper(100)).then(tx => {
           this.rxchar = tx;
           return tx.writeValue(this.encoder.encode("t")); // Send command to start HEG automatically (if not already started)
         });
         if(this.android == true){
           service.getCharacteristic(rxUUID).then(sleeper(1000)).then(tx => {
             return tx.writeValue(this.encoder.encode("o")); // Fast output mode for android
           });
         }
         return service.getCharacteristic(txUUID) // Get stream source
       })
       .then(sleeper(1100)).then(characteristic=>{
           this.txchar = characteristic;
           return characteristic.startNotifications(); // Subscribe to stream
       })
       .then(sleeper(100)).then(characteristic => {
           characteristic.addEventListener('characteristicvaluechanged',
                                           this.onNotificationCallback) //Update page with each notification
       }).then(sleeper(100)).then(this.onConnectedCallback())
       .catch(err => {console.error(err);});
       
       function sleeper(ms) {
           return function(x) {
               return new Promise(resolve => setTimeout(() => resolve(x), ms));
           };
       }
    }
 
    onNotificationCallback = (e) => { //Customize this with the UI (e.g. have it call the handleScore function)
      var val = this.decoder.decode(e.target.value);
      console.log("BLE MSG: ",val);
    }
 
 
    onConnectedCallback = () => {
       //Use this to set up the front end UI once connected here
    }
 
    sendMessage = (msg) => {
      this.rxchar.writeValue(this.encoder.encode(msg));
    }
 
    //Async solution fix for slower devices (android). This is slower than the other method on PC. Credit Dovydas Stirpeika
    async connectAsync() {
         this.device = await navigator.bluetooth.requestDevice({
             filters: [{ namePrefix: 'HEG' }],
             optionalServices: [this.serviceUUID]
         });
 
         console.log("BLE Device: ", this.device);
         
         const btServer = await this.device.gatt?.connect();
         if (!btServer) throw 'no connection';
         this.device.addEventListener('gattserverdisconnected', onDisconnected);
         
         this.server = btServer;
         
         const service = await this.server.getPrimaryService(this.serviceUUID);
         
         // Send command to start HEG automatically (if not already started)
         const tx = await service.getCharacteristic(this.rxUUID);
         await tx.writeValue(this.encoder.encode("t"));
 
         if(this.android == true){
           await tx.writeValue(this.encoder.encode("o"));
         }
         
         this.characteristic = await service.getCharacteristic(this.txUUID);
          this.onConnectedCallback();
         return true;
     }
 
     disconnect = () => this.server?.disconnect();
 
     onDisconnected = () => {
       console.log("BLE device disconnected!");
     }
 
     async readDeviceAsync () {
         if (!this.characteristic) {
             console.log("HEG not connected");
             throw "error";
         }
 
         // await this.characteristic.startNotifications();
         this.doReadHeg = true;
         
         var data = ""
         while (this.doReadHeg) {
             const val = this.decoder.decode(await this.characteristic.readValue());
             if (val !== this.data) {
                 data = val;
                 console.log(data);
                 //data = data[data.length - 1];
                 //const arr = data.replace(/[\n\r]+/g, '')
                 this.n += 1;
                 this.onReadAsyncCallback(data);
             }
         }
     }
 
     onReadAsyncCallback = (data) => {
       console.log("BLE Data: ",data)
     }
 
     stopReadAsync = () => {
         this.doReadHeg = false;
         tx.writeValue(this.encoder.encode("f"));
     }
 
     spsinterval = () => {
       setTimeout(() => {
         console.log("SPS", this.n + '');
         this.n = 0;
         this.spsinterval();
       }, 1000);
     }
 
     async initBLEasync() {
       await this.connectAsync();
       this.readDeviceasync();
       this.spsinterval();
     }
       
 }