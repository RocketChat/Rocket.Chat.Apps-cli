import { IRocketletActivationBridge } from 'temporary-rocketlets-server/server/bridges';
import { ProxiedRocketlet } from 'temporary-rocketlets-server/server/ProxiedRocketlet';

export class ServerRocketletActivationBridge implements IRocketletActivationBridge {
    public rocketletEnabled(rocketlet: ProxiedRocketlet): void {
        console.log(`The Rocketlet ${ rocketlet.getName() } (${ rocketlet.getID() }) has been enabled.`);
    }

    public rocketletDisabled(rocketlet: ProxiedRocketlet): void {
        console.log(`The Rocketlet ${ rocketlet.getName() } (${ rocketlet.getID() }) has been disabled.`);
    }

    public rocketletLoaded(rocketlet: ProxiedRocketlet, enabled: boolean): void {
        console.log(`The Rocketlet ${ rocketlet.getName() } (${ rocketlet.getID() }) has been loaded.`);
    }

    public rocketletUpdated(rocketlet: ProxiedRocketlet, enabled: boolean): void {
        console.log(`The Rocketlet ${ rocketlet.getName() } (${ rocketlet.getID() }) has been updated.`);
    }

    public rocketletRemoved(rocketlet: ProxiedRocketlet): void {
        console.log(`The Rocketlet ${ rocketlet.getName() } (${ rocketlet.getID() }) has been removed.`);
    }
}
