export interface IAppCategory {
    title: string;
    description: string;
    name: string;
    value: string;
}
export interface INormalLoginInfo {
    url: string;
    username: string;
    password: string;
    ignoredFiles: Array<string>;
}
export interface IPersonalAccessTokenLoginInfo {
    url: string;
    userId: string;
    token: string;
    ignoredFiles: Array<string>;
}
