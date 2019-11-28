import { Engine } from '../models';

interface EnginesMap {
  [name: string]: Engine<any>;
}

class EngineRegistry {
  private readonly engines: EnginesMap = {};

  public getEngine(name: string): Engine<any> | null {
    if (!this.engines.hasOwnProperty(name)) {
      return null;
    }

    return this.engines[name];
  }

  public register(engine: Engine<any>) {
    if (this.engines.hasOwnProperty(engine.name)) {
      throw new Error('Check is already registered');
    }

    this.engines[engine.name] = engine;
  }
}

export const registry = new EngineRegistry();
