import { Engine } from '../models';

interface EnginesMap {
  [name: string]: Engine<unknown, unknown>;
}

class EngineRegistry {
  private readonly engines: EnginesMap = {};

  public getEngine(name: string): Engine<unknown, unknown> | null {
    if (!this.engines.hasOwnProperty(name)) {
      return null;
    }

    return this.engines[name];
  }

  public register(engine: Engine<unknown, unknown>) {
    if (this.engines.hasOwnProperty(engine.name)) {
      throw new Error('Check is already registered');
    }

    this.engines[engine.name] = engine;
  }
}

export const registry = new EngineRegistry();
