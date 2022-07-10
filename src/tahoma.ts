import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance, AxiosError } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import { FileCookieStore } from 'tough-cookie-file-store';

import { HttpResponse } from './enums/http-response';
import { TahomaAccount, TahomaAction, TahomaActionGroup } from './interfaces/tahoma';

export class Tahoma {
  private readonly BASE_URL: string = 'https://www.tahomalink.com/enduser-mobile-web/enduserAPI';

  private username: TahomaAccount['username'];
  private password: TahomaAccount['password'];
  private debug: boolean;

  private client: AxiosInstance;
  private jar = new CookieJar(new FileCookieStore('./dist/cookie.json'));
  
  constructor(
    username: TahomaAccount['username'], 
    password: TahomaAccount['password'],
    debug?: boolean
  ) {
    this.client = wrapper(axios.create({ jar: this.jar }));
    this.clientDefaults();
    this.clientInterceptors();

    this.username = username;
    this.password = password;
    this.debug = debug || false;
  }

  /**
	 * Login to the Tahoma service, with the provided login credentials
	 * @returns {Promise<any>}
	 * @async
	 */
  public login(username: string, password: string): Promise<any> {
    const accountData = {
      userId: username,
      userPassword: password
    };

    return this.post(`/login`, accountData, { headers: { "Content-Type": "multipart/form-data" }});
  }

  /**
	 * Logout of the Tahoma service
	 * @returns {Promise<any>}
	 * @async
	 */
  public logout(): Promise<any> {
    return this.post('/logout');
  }


  /**
	 * Get the Tahoma device setup
	 * @returns {Promise<any>}
	 * @async
	 */
  public getSetup(): Promise<any> {
    return this.get('/setup');
  }
  
  /**
	 * Get the Tahoma actionGroups
	 * @returns {Promise<any>}
	 * @async
	 */
  public getActionGroups(): Promise<any> {
    return this.get('/actionGroups');
  }

  /**
	 * Gets the Tahoma device state history
	 * @param {string} deviceUrl - The device url for the device as defined in Tahoma
	 * @param {string} state - The device state for which to retrieve the hisory
	 * @param {EpochTimeStamp} from - The timestamp from which to retrieve the history
	 * @param {EpochTimeStamp} to - The timestamp until to retrieve the history
	 * @returns {Promise<any>}
	 * @async
	 */
  public getDeviceStateHistory(deviceUrl: string, state: string, from: EpochTimeStamp, to: EpochTimeStamp): Promise<any> {
    return this.get(`/setup/devices/${encodeURIComponent(deviceUrl)}/states/${encodeURIComponent(state)}/history/${from}/${to}`);
  }
  
  /**
	 * Invokes an action on a given device in TaHoma
	 * @param {string} name - Name of the device
	 * @param {string} deviceUrl - Url of the device
	 * @param {TahomaAction} action - An object defining the action to be executed
	 * @returns {Promise<any>}
	 * @async
	 */
  public executeDeviceAction(name: string, deviceUrl: string, action: TahomaAction): Promise<any> {
    const actionData: TahomaActionGroup = {
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

    return this.post('/exec/apply', actionData);
  }

  /**
	 * Invokes a Tahoma scenario
	 * @param {string} scenarioId - The oid of the scenario
	 * @returns {Promise<any>}
	 * @async
	 */
  public executeScenario(scenarioId: string): Promise<any> {
    return this.post(`/exec/${scenarioId}`);
  }
  
  /**
	 * Cancels the execution of a previously defined action
	 * @param {string} executionId - The execution id of the action
	 * @returns {Promise<any>}
	 * @async
	 */
  public cancelExecution(executionId: string): Promise<any> {
    return this.delete(`/exec/current/setup/${executionId}`);
  }


  private get(uri: string, params?: any, options?: AxiosRequestConfig): Promise<any> {    
    const requestOptions: AxiosRequestConfig = {
      method: 'GET',
      url: `${this.BASE_URL}${uri}`
    };

    if (params) {
      requestOptions.params = params;
    }

    return this.request({ ...requestOptions, ...options });
  }

  private post(uri: string, data?: any, options?: AxiosRequestConfig): Promise<any> {
    const requestOptions: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.BASE_URL}${uri}`
    };

    if (data) {
      requestOptions.data = data;
    }

    return this.request({ ...requestOptions, ...options });
  }

  private put(uri: string, data?: object, options?: AxiosRequestConfig): Promise<any> {
    const requestOptions: AxiosRequestConfig = {
      method: 'PUT',
      url: `${this.BASE_URL}${uri}`
    };

    if (data) {
      requestOptions.data = data;
    }

    return this.request({ ...requestOptions, ...options });
  }

  private delete(uri: string, options?: AxiosRequestConfig): Promise<any> {
    const requestOptions: AxiosRequestConfig = {
      method: 'DELETE',
      url: `${this.BASE_URL}${uri}`
    };

    return this.request({ ...requestOptions, ...options });
  }


  private request(options: AxiosRequestConfig): Promise<any> {
    if (this.debug) console.debug(options);

    return this.client(options)
      .then((response: AxiosResponse) => {
        if (response.status !== HttpResponse.OK) {
          return 'http_error';
        }

        return response;
      })
      .catch((error: AxiosError) => {
        if (this.debug) console.error(error.response?.data);
        Promise.reject(error.response);
      });
  }

  private clientDefaults() {
    this.client.defaults.headers.common['Content-Type'] = 'application/json';
    this.client.defaults.headers.common['Accept'] = 'application/json';
  }

  private clientInterceptors() {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError) => {
        if (error.response?.status !== HttpResponse.UNAUTHORIZED || error.response?.config.url?.includes('login')) {
          return Promise.reject(error);
        }

        return this.login(this.username, this.password)
          .then((response: AxiosResponse) => {
            if (!response.data.success) {
              return 'login_error';
            }

            const originalOptions: AxiosRequestConfig = error.config;
            const forwardOptions: AxiosRequestConfig = {
              method: originalOptions.method,
              url: originalOptions.url
            }

            if (originalOptions.data) {
              forwardOptions.data = originalOptions.data;
            }

            if (originalOptions.params) {
              forwardOptions.params = originalOptions.params;
            }
    
            return this.request(forwardOptions);
          });
      }
  );
  }
}
