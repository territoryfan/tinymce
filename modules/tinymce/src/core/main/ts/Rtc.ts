import Editor from './api/Editor';
import { Obj, Option, Type, Fun } from '@ephox/katamari';
import { UndoLevel, UndoLevelType, UndoBookmark, Locks, UndoManager, Index } from './undo/UndoManagerTypes';
import Node from './api/html/Node';
import { Content } from './content/EditorContent';
import Serializer from './api/html/Serializer';
import * as FilterNode from './html/FilterNode';
import { ContentFormat } from './content/GetContent';
import Promise from '@ephox/wrap-promise-polyfill';
import { RangeLikeObject } from './selection/RangeTypes';
import { beforeChange as editorBeforeChange, addUndoLevel as editorAddUndoLevel } from './undo/Operations';
import { Event } from '@ephox/dom-globals';

const isTreeNode = (content: any): content is Node => content instanceof Node;

const isSupportedContentFormat = (format) => format !== 'text';

interface RtcRuntimeApi {
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

interface RtcAdaptor {
  undoManager: {
    beforeChange: (editor: Editor, locks: Locks, beforeBookmark: UndoBookmark) => void
    addUndoLevel: (editor: Editor, undoManager: UndoManager, index: Index, locks: Locks, beforeBookmark: UndoBookmark, level?: UndoLevel, event?: Event) => UndoLevel
    // undo: () => void;
    // redo: () => void;
    // hasUndo: () => boolean;
    // hasRedo: () => boolean;
    // transact: (fn: () => void) => void;
  };
  // applyFormat: (format: string, vars: Record<string, string>, node: Node | RangeLikeObject) => void;
  // toggleFormat: (format: string, vars: Record<string, string>) => void;
  // removeFormat: (format: string, vars: Record<string, string>) => void;
  // setContent: (node: Node) => void;
  // getContent: () => Node | null;
  // insertContent: (node: Node) => void;
  // getSelectedContent: () => Node | null;
}

interface RtcPluginApi {
  setup: (editor: Editor) => Promise<RtcRuntimeApi>;
}

interface RtcEditor extends Editor {
  rtcInstance: RtcAdaptor;
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

const makePlainAdaptor = (): RtcAdaptor => ({
  undoManager: {
    beforeChange: (editor, locks, beforeBookmark) => editorBeforeChange(editor, locks, beforeBookmark),
    addUndoLevel: (editor, undoManager, index, locks, beforeBookmark, level, event) => editorAddUndoLevel(editor, undoManager, index, locks, beforeBookmark, level, event);
  }
});

const makeRtcAdaptor = (rtcEditor): RtcAdaptor => {
  const unsupported = Fun.die('Unimplemented feature for rtc');
  const ignore = Fun.noop;
  return {
    undoManager: {
      beforeChange: ignore,
      addUndoLevel: unsupported
    }
  };
};

export const setup = (editor: Editor): Promise<boolean> => {
  const editorCast = editor as RtcEditor;
  return (Obj.get(editor.plugins, 'rtc') as Option<RtcPluginApi>).fold(
    () => {
      editorCast.rtcInstance = makePlainAdaptor();
      return Promise.resolve(false)
    },
    (rtc) => rtc.setup(editor).then((rtcEditor) => {
      editorCast.rtcInstance = makeRtcAdaptor(rtcEditor);
      return true;
    })
  );
};

const getPluginApi = (editor: Editor): Option<RtcRuntimeApi> => Obj.get(editor.plugins, 'rtc') as Option<RtcRuntimeApi>;

const defaultVars = (vars: Record<string, string>) => Type.isObject(vars) ? vars : {};

export const beforeChange = (editor: Editor, locks: Locks, beforeBookmark: UndoBookmark) => {
  (editor as RtcEditor).rtcInstance.undoManager.beforeChange(editor, locks, beforeBookmark);
};

export const addUndoLevel = (editor: Editor, undoManager: UndoManager, index: Index, locks: Locks, beforeBookmark: UndoBookmark, level?: UndoLevel, event?: Event): UndoLevel => {
  return (editor as RtcEditor).rtcInstance.undoManager.addUndoLevel(editor, undoManager, index, locks, beforeBookmark, level, event);
};

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

export const undo = (editor: Editor, fallback: () => UndoLevel): UndoLevel => {
  return getPluginApi(editor).fold(fallback, (rtc) => {
    rtc.undo();
    return createDummyUndoLevel();
  });
};

export const redo = (editor: Editor, fallback: () => UndoLevel): UndoLevel => {
  return getPluginApi(editor).fold(fallback, (rtc) => {
    rtc.redo();
    return createDummyUndoLevel();
  });
};

export const hasUndo = (editor: Editor, fallback: () => boolean): boolean => {
  return getPluginApi(editor).fold(fallback, (rtc) => rtc.hasUndo());
};

export const hasRedo = (editor: Editor, fallback: () => boolean): boolean => {
  return getPluginApi(editor).fold(fallback, (rtc) => rtc.hasRedo());
};

export const transact = (editor: Editor, fn: () => void, fallback: () => UndoLevel): UndoLevel => {
  return getPluginApi(editor).fold(fallback, (rtc) => {
    rtc.transact(fn);
    return createDummyUndoLevel();
  });
};

export const applyFormat = (editor: Editor, format: string, vars: Record<string, string>, node: Node | RangeLikeObject): void => {
  (editor as RtcEditor).rtcInstance.applyFormat(format, vars, node)
  return getPluginApi(editor).fold(fallback, (rtc) => rtc.applyFormat(format, defaultVars(vars)));
};

export const toggleFormat = (editor: Editor, format: string, vars: Record<string, string>, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (rtc) => rtc.toggleFormat(format, defaultVars(vars)));
};

export const removeFormat = (editor: Editor, format: string, vars: Record<string, string>, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (rtc) => rtc.removeFormat(format, defaultVars(vars)));
};

export const setContent = (editor: Editor, content: Content, fallback: () => Content): Content => {
  return getPluginApi(editor).fold(fallback, (rtc) => {
    const fragment = isTreeNode(content) ? content : editor.parser.parse(content, { isRootContent: true, insert: true });
    rtc.setContent(fragment);
    return content;
  });
};

export const getContent = (editor: Editor, format: ContentFormat, fallback: () => Content): Content => {
  return getPluginApi(editor).filter((_) => isSupportedContentFormat(format)).fold(fallback, (rtc) => {
    const fragment = rtc.getContent();
    const serializer = Serializer({ inner: true });

    FilterNode.filter(editor.serializer.getNodeFilters(), editor.serializer.getAttributeFilters(), fragment);

    return serializer.serialize(fragment);
  });
};

export const insertContent = (editor: Editor, content: Content, fallback: () => void): void => {
  return getPluginApi(editor).fold(fallback, (rtc) => {
    const fragment = isTreeNode(content) ? content : editor.parser.parse(content, { insert: true });
    rtc.insertContent(fragment);
  });
};

export const getSelectedContent = (editor: Editor, format: ContentFormat, fallback: () => string): string => {
  return getPluginApi(editor).filter((_) => isSupportedContentFormat(format)).fold(fallback, (rtc) => {
    const fragment = rtc.getSelectedContent();
    const serializer = Serializer({});
    return serializer.serialize(fragment);
  });
};
