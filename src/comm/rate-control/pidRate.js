/*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict'

var RateInterface = require('./rateInterface.js');

/**
 * Basic PID Controller for driving at a target loading (backlog transactions). This controller will aim to maintain a defined backlog
 * of transactions by modifying the driven TPS.
 * 
 * The target loading, initial TPS rate and gains for the controller must be specified within the options for the controller type:
 * "rateControl" : [{"type": "pid-rate", "opts": {"targetLoad": 5, "initialTPS": 2, "proportional": 0.2, "integral": 0.0001, "derrivative": 0.1}}]
 * 
 * To view controller output to assist in modifying the controller gains, an additional 'showVars' option must be specified:
 * "rateControl" : [{"type": "pid-rate", "opts": {"targetLoad": 5, "initialTPS": 2, "proportional": 0.2, "integral": 0.0001, "derrivative": 0.1, "showVars": true}}]
 * 
 */
class PidRate extends RateInterface {
    constructor(blockchain, options) {
        super(blockchain, options);
    }

    init(msg) {  
        // Required
        this.targetLoad = this.options.targetLoad;
        this.Kp = this.options.proportional;
        this.Ki = this.options.integral;
        this.Kd = this.options.derrivative;

        // Optional
        this.sleep = this.options.initialTPS ? 1000/this.options.initialTPS : 100;
        this.showVars = this.options.showVars ? this.options.showVars : false;

        // Internal variables
        this.previousError = this.targetLoad;
        this.integral = 0;
    }

    /**
    * Sleep based on targetting a specific working load through a basic PID controller
    * @param start {number}, generation time of the first transaction
    * @param txSeq {number}, sequence number of the current transaction
    * @param currentResults {Array}, current results
    * @return {promise}
    */
    applyRateControl(start, idx, currentResults) {
        // We steer the load by increasing/decreasing the sleep time to adjust the TPS using a basic PID controller
        // We will only observe currentResults growth once the txn is complete and a result is available
        // -at this point the txn will either be in state success/fail

        // Update current transaction backlog error
        // error = what you want - what you have
        let error = this.targetLoad - (idx - currentResults.length);

        if (this.showVars) { 
            console.log('Current load error: ', error);
        }

        // Determine Controller Coeffients
        this.integral = this.integral + (error * this.sleep/1000);
        let P = this.Kp * error;
        let I = this.Ki * this.integral;
        let D = this.Kd * (error - this.previousError)/this.sleep;

        // Update error variable
        this.previousError = error;
       
        // Update the sleep time
        this.sleep = this.sleep - (P + I + D);

        if (this.showVars) {
            console.log('Current P value: ', P);
            console.log('Current I value: ', I);
            console.log('Current D value: ', D);
            console.log('New sleep time: ',this.sleep);
        }

        if (this.sleep > 5) {
            return new Promise(resolve => setTimeout(resolve, this.sleep));
        } else {
            return Promise.resolve();
        }                
    }
}

module.exports = PidRate;