import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Patch DOM methods to handle Google Translate interference
const originalRemoveChild = Node.prototype.removeChild;
const originalInsertBefore = Node.prototype.insertBefore;
const originalReplaceChild = Node.prototype.replaceChild;

Node.prototype.removeChild = function<T extends Node>(child: T): T {
  try {
    return originalRemoveChild.call(this, child);
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      console.warn('Google Translate DOM interference detected - ignoring removeChild error');
      return child as T;
    }
    throw e;
  }
};

Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
  try {
    return originalInsertBefore.call(this, newNode, referenceNode);
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      console.warn('Google Translate DOM interference detected - ignoring insertBefore error');
      return newNode as T;
    }
    throw e;
  }
};

Node.prototype.replaceChild = function<T extends Node>(newChild: Node, oldChild: T): T {
  try {
    return originalReplaceChild.call(this, newChild, oldChild);
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      console.warn('Google Translate DOM interference detected - ignoring replaceChild error');
      return oldChild as T;
    }
    throw e;
  }
};

createRoot(document.getElementById("root")!).render(<App />);
