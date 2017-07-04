import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata/IRocketletInfo';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class GithubRocketlet extends Rocketlet {
    constructor(info: IRocketletInfo) {
        super(info);
    }
}
