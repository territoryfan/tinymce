import { Cell } from '@ephox/katamari';

import { nuState } from '../common/BehaviourState';
import { DockingConfigSpec, DockingMode } from './DockingTypes';

const init = (spec: DockingConfigSpec) => {
  const docked = Cell(false);
  const visible = Cell(true);
  const modes = Cell<DockingMode[]>(spec.modes);

  const readState = () => {
    return `docked:  ${docked.get()}, visible: ${visible.get()}, modes: ${modes.get().join(',')}`;
  };

  return nuState({
    isDocked: docked.get,
    setDocked: docked.set,
    isVisible: visible.get,
    setVisible: visible.set,
    getModes: modes.get,
    setModes: modes.set,
    readState
  });
};

export {
  init
};
