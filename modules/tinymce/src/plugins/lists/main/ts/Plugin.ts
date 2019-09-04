/**
 * Copyright (c) Tiny Technologies, Inc. All rights reserved.
 * Licensed under the LGPL or a commercial license.
 * For LGPL see License.txt in the project root for license information.
 * For commercial licenses see https://www.tiny.cloud/
 */

import PluginManager from 'tinymce/core/api/PluginManager';
import Api from './api/Api';
import Commands from './api/Commands';
import Keyboard from './core/Keyboard';
import Buttons from './ui/Buttons';
import { hasRtcPlugin } from './core/DetectRtc';

export default () => {
  PluginManager.add('lists', (editor) => {
    if (hasRtcPlugin(editor) === false) {
      Keyboard.setup(editor);
      Commands.register(editor);
    }

    Buttons.register(editor);

    return Api.get(editor);
  });
};
