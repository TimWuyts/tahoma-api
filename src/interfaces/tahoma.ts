export interface TahomaAccount {
    username: string;
    password: string;
}

export interface TahomaGateway {
    gatewayId: string;
    type: number;
    subType: number;
    alive: boolean;
    syncInProgress: boolean;
    upToDate: boolean;
    updateStatus: string;
    mode: string;
}

export interface TahomaDevice {
    oid: string;
    label: string;
    type: number;
    available: boolean;
    enabled: true;
    controllableName: string;
    definition: TahomaDeviceDefinition;
    states: TahomaState[];
    attributes: TahomaAttribute[];
}

export interface TahomaDeviceDefinition {
    commands: TahomaCommand[];
    states: TahomaState[];
    qualifiedName: string;
    type: string;
}

export interface TahomaAction {
    name?: string;
    deviceURL?: string;
    commands?: TahomaCommand[];
}

export interface TahomaActionGroup {
    oid?: string;
    label: string;
    actions: TahomaAction[];
}

export interface TahomaAttribute {

}

export interface TahomaState {
    name: string;
    value: any;
    type: number;
}

export interface TahomaCommand {
    name?: string;
    type?: number;
    parameters?: any[];
}