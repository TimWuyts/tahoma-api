import fetch from 'node-fetch';

export type TahomaAccount = {
  username: string;
  password: string;
}

export type TahomaAction = {
  name: string
}

export class Tahoma {
  private username: string;
  private password: string;

  private readonly baseUrl: string = 'https://www.tahomalink.com/enduser-mobile-web/enduserAPI';
  
  constructor(
    username: TahomaAccount['username'], 
    password: TahomaAccount['password']
  ) {
    this.username = username;
    this.password = password;
  }
  
  /**
	 * Login to the Tahoma service, with the provided login credentials
	 * @returns {Promise<object>}
	 * @async
	 */
  public login(): Promise<object> {
    const data = {
      userId: this.username,
      userPassword: this.password
    };

    return this.post('/login', data);
  }

  /**
	 * Logout of the Tahoma service
	 * @returns {Promise<object>}
	 * @async
	 */
  public logout(): Promise<object> {
    return this.post('/logout');
  }

  /**
	 * Get the Tahoma device setup
	 * @returns {Promise<object>}
	 * @async
	 */
  public setup(): Promise<object> {
    return this.get('/setup');
  }

  /**
	 * Get the Tahoma actionGroups
	 * @returns {Promise<object>}
	 * @async
	 */
  public getActionGroups(): Promise<object> {
    return this.get('/actionGroups');
  }

  /**
	 * Gets the Tahoma device state history
	 * @param {string} deviceUrl - The device url for the device as defined in Tahoma
	 * @param {string} state - The device state for which to retrieve the hisory
	 * @param {EpochTimeStamp} from - The timestamp from which to retrieve the history
	 * @param {EpochTimeStamp} to - The timestamp until to retrieve the history
	 * @returns {Promise<object>}
	 * @async
	 */
  public getDeviceStateHistory(deviceUrl: string, state: string, from: EpochTimeStamp, to: EpochTimeStamp): Promise<object> {
    return this.get(`/setup/devices/${encodeURIComponent(deviceUrl)}/states/${encodeURIComponent(state)}/history/${from}/${to}`);
  }

  /**
	 * Invokes an action on a given device in TaHoma
	 * @param {string} name - Name of the device
	 * @param {string} deviceUrl - Url of the device
	 * @param {TahomaAction} action - An object defining the action to be executed
	 * @returns {Promise<object>}
	 * @async
	 */
  public executeDeviceAction(name: string, deviceUrl: string, action: TahomaAction): Promise<object> {
    const data = {
      label: `${name}-${action.name}`,
      actions: [
        {
          deviceURL: deviceUrl,
          commands: [
            action
          ]
        }
      ]
    };

    return this.post('/exec/apply', );
  }

  /**
	 * Invokes a Tahoma scenario
	 * @param {string} scenarioId - The oid of the scenario
	 * @returns {Promise<object>}
	 * @async
	 */
  public executeScenario(scenarioId: string): Promise<object> {
    return this.post(`/exec/${scenarioId}`);
  }

  /**
	 * Cancels the execution of a previously defined action
	 * @param {string} executionId - The execution id of the action
	 * @returns {Promise<object>}
	 * @async
	 */
  public cancelExecution(executionId: string): Promise<object> {
    return this.delete(`/exec/current/setup/${executionId}`);
  }


  private get(uri: string): Promise<object> {
    const options = {
      method: 'GET'
    };

    return this.request(uri, options);
  }

  private post(uri: string, body?: object, json: boolean = true): Promise<object> {
    const options = {
      method: 'POST',
      body: JSON.stringify(body), 
      headers: { 'Content-Type': 'application/json' }
    };

    return this.request(uri, options, json);
  }

  private put(uri: string, body?: object, json: boolean = true): Promise<object> {
    const options = {
      method: 'PUT',
      body: JSON.stringify(body), 
      headers: { 'Content-Type': 'application/json' }
    };

    return this.request(uri, options, json);
  }

  private delete(uri: string): Promise<object> {
    const options = {
      method: 'DELETE'
    };

    return this.request(uri, options);
  }


  private request(uri: string, options: object, json: boolean = true): Promise<object> {
    return new Promise((resolve, reject) => {
      try {
        fetch(this.baseUrl + uri, options)
          .then((response) => {
            if (response.status === 401) {
              // return this.reAuthenticate(options)
              //   .then(result => resolve(result))
              //   .catch(error => reject(error));
            }
            
            resolve(json ? response.json() : response);
          })
          .catch(error => reject(error));
      } catch(error) {
        reject(error);
      }
    });
  }
}
