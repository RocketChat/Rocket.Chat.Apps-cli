
export const initialSettingTemplate = (): string => {
    return `
import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';
export const settings: Array<ISetting> = [
];
`;
};

export const appendNewSetting = (data: string): string => {
    const toWrite = `
{
    id: '',
    type: SettingType.STRING,
    packageValue: '',
    required: false,
    public: false,
    i18nLabel: '',
    i18nDescription: '',
},
`;
    const index = data.lastIndexOf('];');
    return data.slice(0, index) + toWrite + data.slice(index);
};
