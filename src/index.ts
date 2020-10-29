import './initializer';

import { main } from './main'
import { viewSize } from '@giveback007/util-lib/dist/browser'

import 'regenerator-runtime/runtime'
import "./js/HEGwebAPI.js"
import "./js/threeApp.js"
// import "./js/serialUtils.js"
import "./js/initWebapp.js"
import { elm } from './util/util';

main(); // import test

setTimeout(() => elm('title').style = 'opacity: 0;', 2500);

if (process.env.NODE_ENV === 'development') {
    console.log('DEV MODE');

    window.onresize = () => {
        console.clear();
        console.log(viewSize())
    };
}

if (process.env.NODE_ENV === 'production') {
    console.log('Production');
    
    // import * as serviceWorker from './service-worker';
    const serviceWorker = require('./service-worker');
    // If you want your app to work offline and load faster, you can change
    // unregister() to register() below. Note this comes with some pitfalls.
    serviceWorker.register();
}
