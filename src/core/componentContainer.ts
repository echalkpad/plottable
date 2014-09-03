///<reference path="../reference.ts" />

module Plottable {
export module Abstract {
  /*
   * An abstract ComponentContainer class to encapsulate Table and ComponentGroup's shared functionality.
   * It will not do anything if instantiated directly.
   */
  export class ComponentContainer extends Component {
    public _components: Abstract.Component[] = [];

    public _anchor(element: D3.Selection) {
      super._anchor(element);
      this._components.forEach((c) => c._anchor(this._content));
    }

    public _render() {
      this._components.forEach((c) => c._render());
    }

    public _removeComponent(c: Abstract.Component) {
      var removeIndex = this._components.indexOf(c);
      if (removeIndex >= 0) {
        this._components.splice(removeIndex, 1);
        this._invalidateLayout();
      }
    }

    public _addComponent(c: Abstract.Component, prepend = false): boolean {
      if (c == null || this._components.indexOf(c) >= 0) {
        return false;
      }

      if (prepend) {
        this._components.unshift(c);
      } else {
        this._components.push(c);
      }
      c._parent = this;
      if (this._isAnchored) {
        c._anchor(this._content);
      }
      this._invalidateLayout();
      return true;
    }

    /**
     * Returns a list of components in the ComponentContainer.
     *
     * @returns {Component[]} the contained Components
     */
    public components(): Abstract.Component[] {
      return this._components.slice(); // return a shallow copy
    }

    /**
     * Returns true iff the ComponentContainer is empty.
     *
     * @returns {boolean} Whether the calling ComponentContainer is empty.
     */
    public empty() {
      return this._components.length === 0;
    }

    /**
     * Detaches all components contained in the ComponentContainer, and
     * empties the ComponentContainer.
     *
     * @returns {ComponentContainer} The calling ComponentContainer
     */
    public detachAll() {
      // Calling c.remove() will mutate this._components because the component will call this._parent._removeComponent(this)
      // Since mutating an array while iterating over it is dangerous, we instead iterate over a copy generated by Arr.slice()
      this._components.slice().forEach((c: Abstract.Component) => c.detach());
      return this;
    }

    public remove() {
      super.remove();
      this._components.slice().forEach((c: Abstract.Component) => c.remove());
    }
  }
}
}
