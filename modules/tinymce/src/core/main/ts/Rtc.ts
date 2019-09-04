import Editor from './api/Editor';
import { Obj, Option, Type } from '@ephox/katamari';
import { UndoLevel, UndoLevelType } from './undo/UndoManagerTypes';
import Node from './api/html/Node';
import { Content } from './content/EditorContent';
import Serializer from './api/html/Serializer';
import * as FilterNode from './html/FilterNode';
import { ContentFormat } from './content/GetContent';

const isTreeNode = (content: any): content is Node => content instanceof Node;

const isSupportedContentFormat = (format) => format !== 'text';

interface RtcPluginApi {
  setup: (editor: Editor, callback: (rtcMode: boolean) => void) => void;
  undo: () => void;
  redo: () => void;
  hasUndo: () => boolean;
  hasRedo: () => boolean;
  transact: (fn: () => void) => void;
  applyFormat: (format: string, vars: Record<string, string>) => void;
  toggleFormat: (format: string, vars: Record<string, string>) => void;
  removeFormat: (format: string, vars: Record<string, string>) => void;
  setContent: (node: Node) => void;
  getContent: () => Node | null;
  insertContent: (node: Node) => void;
  getSelectedContent: () => Node | null;
}

const createDummyUndoLevel = (): UndoLevel => {
  return {
    type: UndoLevelType.Complete,
    fragments: [],
    content: '',
    bookmark: null,
    beforeBookmark: null
  };
};

const getPluginApi = (editor: Editor): Option<RtcPluginApi> => Obj.get(editor.plugins, 'rtc') as Option<RtcPluginApi>;

const defaultVars = (vars: Record<string, string>) => Type.isObject(vars) ? vars : {};

export const ignore = <T>(editor: Editor, fallback: () => T): T => {
  if (getPluginApi(editor).isNone()) {
    return fallback();
  }
};

export const block = <T>(editor: Editor, fallback: () => T): T => {
  if (getPluginApi(editor).isNone()) {
    return fallback();
  } else {
    throw new Error('Unimplemented feature for rtc');
  }
};

export const setup = (editor: Editor, callback: (rtcMode: boolean) => void) => {
  getPluginApi(editor).fold(
    () => callback(false),
    (api) => api.setup(editor, callback)
  );
};

export const undo = (editor: Editor, fallback: () => UndoLevel): UndoLevel => {
  return getPluginApi(editor).fold(fallback, (api) => {
    api.undo();
    return createDummyUndoLevel();
  });
};

export const redo = (editor: Editor, fallback: () => UndoLevel): UndoLevel => {
  return getPluginApi(editor).fold(fallback, (api) => {
    api.redo();
    return createDummyUndoLevel();
  });
};

export const hasUndo = (editor: Editor, fallback: () => boolean): boolean => {
  return getPluginApi(editor).fold(fallback, (api) => api.hasUndo());
};

export const hasRedo = (editor: Editor, fallback: () => boolean): boolean => {
  return getPluginApi(editor).fold(fallback, (api) => api.hasRedo());
};

export const transact = (editor: Editor, fn: () => void, fallback: () => UndoLevel): UndoLevel => {
  return getPluginApi(editor).fold(fallback, (api) => {
    api.transact(fn);
    return createDummyUndoLevel();
  });
};

export const applyFormat = (editor: Editor, format: string, vars: Record<string, string>, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (api) => api.applyFormat(format, defaultVars(vars)));
};

export const toggleFormat = (editor: Editor, format: string, vars: Record<string, string>, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (api) => api.toggleFormat(format, defaultVars(vars)));
};

export const removeFormat = (editor: Editor, format: string, vars: Record<string, string>, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (api) => api.removeFormat(format, defaultVars(vars)));
};

export const setContent = (editor: Editor, content: Content, fallback: () => Content): Content => {
  return getPluginApi(editor).fold(fallback, (api) => {
    const fragment = isTreeNode(content) ? content : editor.parser.parse(content, { isRootContent: true, insert: true });
    api.setContent(fragment);
    return content;
  });
};

export const getContent = (editor: Editor, format: ContentFormat, fallback: () => Content): Content => {
  return getPluginApi(editor).filter((_) => isSupportedContentFormat(format)).fold(fallback, (api) => {
    const fragment = api.getContent();
    const serializer = Serializer({ inner: true });

    FilterNode.filter(editor.serializer.getNodeFilters(), editor.serializer.getAttributeFilters(), fragment);

    return serializer.serialize(fragment);
  });
};

export const insertContent = (editor: Editor, content: Content, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (api) => {
    const fragment = isTreeNode(content) ? content : editor.parser.parse(content, { insert: true });
    api.insertContent(fragment);
  });
};

export const getSelectedContent = (editor: Editor, format: ContentFormat, fallback: () => string): string => {
  return getPluginApi(editor).filter((_) => isSupportedContentFormat(format)).fold(fallback, (api) => {
    const fragment = api.getSelectedContent();
    const serializer = Serializer({});
    return serializer.serialize(fragment);
  });
};
