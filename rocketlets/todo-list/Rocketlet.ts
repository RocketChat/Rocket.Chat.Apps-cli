import { IRocketletInfo } from 'temporary-rocketlets-ts-definition/metadata';
import { Rocketlet } from 'temporary-rocketlets-ts-definition/Rocketlet';

export class TodoListRocketlet extends Rocketlet {
    constructor(info: IRocketletInfo) {
        super(info);
    }
}
