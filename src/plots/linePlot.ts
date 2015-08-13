///<reference path="../reference.ts" />

module Plottable {
export module Plots {
  type EdgeIntersection = {
    left: Point[],
    right: Point[],
    top: Point[],
    bottom: Point[]
  };

  export class Line<X> extends XYPlot<X, number> {
    private _interpolator: string | ((points: Array<[number, number]>) => string) = "linear";

    private _autorangeSmooth = false;

    /**
     * A Line Plot draws line segments starting from the first data point to the next.
     *
     * @constructor
     */
    constructor() {
      super();
      this.addClass("line-plot");
      var animator = new Animators.Easing();
      animator.stepDuration(Plot._ANIMATION_MAX_DURATION);
      animator.easingMode("exp-in-out");
      animator.maxTotalDuration(Plot._ANIMATION_MAX_DURATION);
      this.animator(Plots.Animator.MAIN, animator);
      this.attr("stroke", new Scales.Color().range()[0]);
      this.attr("stroke-width", "2px");
    }

    public x(): Plots.AccessorScaleBinding<X, number>;
    public x(x: number | Accessor<number>): Line<X>;
    public x(x: X | Accessor<X>, xScale: Scale<X, number>): Line<X>;
    public x(x?: number | Accessor<number> | X | Accessor<X>, xScale?: Scale<X, number>): any {
      if (xScale instanceof QuantitativeScale && this.autorangeMode() === "x") {
        (<QuantitativeScale<X>>xScale).snapsDomain(!this._autorangeSmooth);
      }

      if (xScale == null) {
        return super.x(<number | Accessor<number>>x);
      } else {
        return super.x(<X | Accessor<X>>x, xScale);
      }

    }

    public y(): Plots.AccessorScaleBinding<number, number>;
    public y(y: number | Accessor<number>): Line<X>;
    public y(y: number | Accessor<number>, yScale: Scale<number, number>): Line<X>;
    public y(y?: number | Accessor<number>, yScale?: Scale<number, number>): any {
      if (yScale instanceof QuantitativeScale && this.autorangeMode() === "y") {
        (<QuantitativeScale<number>>yScale).snapsDomain(!this._autorangeSmooth);
      }
      return super.y(y, yScale);
    }

    public autorangeMode(): string;
    public autorangeMode(autorangeMode: string): Line<X>;
    public autorangeMode(autorangeMode?: string): any {
      if (this.autorangeSmooth() && autorangeMode === "x" || autorangeMode === "y") {
        if (autorangeMode === "x" && this.x() && this.x().scale && this.x().scale instanceof QuantitativeScale) {
          (<QuantitativeScale<X>>this.x().scale).snapsDomain(!this.autorangeSmooth());
        }

        if (autorangeMode === "y" && this.y() && this.y().scale && this.y().scale instanceof QuantitativeScale) {
          (<QuantitativeScale<number>>this.y().scale).snapsDomain(!this.autorangeSmooth());
        }
      }
      return super.autorangeMode(autorangeMode);
    }

    /**
     * Gets whether or not the autoranging is done smoothly.
     */
    public autorangeSmooth(): boolean;
    /**
     * Sets whether or not the autorange is done smoothly.
     *
     * Smooth autoranging is done by making sure lines always exit on the left / right side of the plot
     * and deactivating the nice domain feature on the scales
     */
    public autorangeSmooth(autorangeSmooth: boolean): Plots.Line<X>;
    public autorangeSmooth(autorangeSmooth?: boolean): any {
      if (autorangeSmooth == null) {
        return this._autorangeSmooth;
      }
      this._autorangeSmooth = autorangeSmooth;

      if (this.autorangeMode() === "x" && this.x() && this.x().scale && this.x().scale instanceof QuantitativeScale) {
        (<QuantitativeScale<X>>this.x().scale).snapsDomain(!autorangeSmooth);
      }

      if (this.autorangeMode() === "y" && this.y() && this.y().scale && this.y().scale instanceof QuantitativeScale) {
        (<QuantitativeScale<number>>this.y().scale).snapsDomain(!autorangeSmooth);
      }

      this.autorangeMode(this.autorangeMode());
      return this;
    }

    /**
     * Gets the interpolation function associated with the plot.
     *
     * @return {string | (points: Array<[number, number]>) => string)}
     */
    public interpolator(): string | ((points: Array<[number, number]>) => string);
    /**
     * Sets the interpolation function associated with the plot.
     *
     * @param {string | points: Array<[number, number]>) => string} interpolator Interpolation function
     * @return Plots.Line
     */
    public interpolator(interpolator: string | ((points: Array<[number, number]>) => string)): Plots.Line<X>;
    public interpolator(interpolator: "linear"): Line<X>;
    public interpolator(interpolator: "linear-closed"): Line<X>;
    public interpolator(interpolator: "step"): Line<X>;
    public interpolator(interpolator: "step-before"): Line<X>;
    public interpolator(interpolator: "step-after"): Line<X>;
    public interpolator(interpolator: "basis"): Line<X>;
    public interpolator(interpolator: "basis-open"): Line<X>;
    public interpolator(interpolator: "basis-closed"): Line<X>;
    public interpolator(interpolator: "bundle"): Line<X>;
    public interpolator(interpolator: "cardinal"): Line<X>;
    public interpolator(interpolator: "cardinal-open"): Line<X>;
    public interpolator(interpolator: "cardinal-closed"): Line<X>;
    public interpolator(interpolator: "monotone"): Line<X>;
    public interpolator(interpolator?: string | ((points: Array<[number, number]>) => string)): any {
      if (interpolator == null) {
        return this._interpolator;
      }
      this._interpolator = interpolator;
      this.render();
      return this;
    }

    protected _createDrawer(dataset: Dataset): Drawer {
      return new Plottable.Drawers.Line(dataset);
    }

    protected _extentsForProperty(property: string) {
      var extents = super._extentsForProperty(property);

      if (!this._autorangeSmooth) {
        return extents;
      }

      if (this.autorangeMode() !== property) {
        return extents;
      }

      if (this.autorangeMode() !== "x" && this.autorangeMode() !== "y") {
        return extents;
      }

      var edgeIntersectionPoints = this._getEdgeIntersectionPoints();
      var includedValues: number[];
      if (this.autorangeMode() === "y") {
        includedValues = edgeIntersectionPoints.left.concat(edgeIntersectionPoints.right).map((point) => point.y);
      } else { // === "x"
        includedValues = edgeIntersectionPoints.top.concat(edgeIntersectionPoints.bottom).map((point) => point.x);
      }

      var maxIncludedValue = Math.max.apply(this, includedValues);
      var minIncludedValue = Math.min.apply(this, includedValues);

      extents = extents.map((extent) => {
        // When no end-points are in the viewport
        if (extent.length === 0) {
          return [minIncludedValue, maxIncludedValue];
        }
        return [Math.min(minIncludedValue, extent[0]), Math.max(maxIncludedValue, extent[1])];
      });

      return extents;
    }

    private _getEdgeIntersectionPoints(): EdgeIntersection {
      if (!(this.y().scale instanceof QuantitativeScale && this.x().scale instanceof QuantitativeScale)) {
        return {
          top: [],
          bottom: [],
          left: [],
          right: []
        };
      }

      var yScale = <QuantitativeScale<number>>this.y().scale;
      var xScale = <QuantitativeScale<any>>this.x().scale;

      var intersectionPoints: EdgeIntersection = {
        top: [],
        bottom: [],
        left: [],
        right: []
      };
      var leftX = xScale.scale(xScale.domain()[0]);
      var rightX = xScale.scale(xScale.domain()[1]);
      var downY = yScale.scale(yScale.domain()[0]);
      var upY = yScale.scale(yScale.domain()[1]);

      this.datasets().forEach((dataset) => {
        var data = dataset.data();

        var x1: number, x2: number, y1: number, y2: number;
        var prevX: number, prevY: number, currX: number, currY: number;
        for (var i = 1; i < data.length; i++) {
          prevX = currX || xScale.scale(this.x().accessor(data[i - 1], i - 1, dataset));
          prevY = currY || yScale.scale(this.y().accessor(data[i - 1], i - 1, dataset));

          currX = xScale.scale(this.x().accessor(data[i], i, dataset));
          currY = yScale.scale(this.y().accessor(data[i], i, dataset));

          // If values crossed left edge
          if ((prevX < leftX) === (leftX <= currX)) {
            x1 = leftX - prevX;
            x2 = currX - prevX;
            y2 = currY - prevY;
            y1 = x1 * y2 / x2;

            intersectionPoints.left.push({
              x: leftX,
              y: yScale.invert(prevY + y1)
            });
          }

          // If values crossed right edge
          if ((prevX < rightX) === (rightX <= currX)) {
            x1 = rightX - prevX;
            x2 = currX - prevX;
            y2 = currY - prevY;
            y1 = x1 * y2 / x2;

            intersectionPoints.right.push({
              x: rightX,
              y: yScale.invert(prevY + y1)
            });
          }

          // If values crossed upper edge
          if ((prevY < upY) === (upY <= currY)) {
            x2 = currX - prevX;
            y1 = upY - prevY;
            y2 = currY - prevY;
            x1 = y1 * x2 / y2;

            intersectionPoints.top.push({
              x: xScale.invert(prevX + x1),
              y: upY
            });
          }

          // If values crossed lower edge
          if ((prevY < downY) === (downY <= currY)) {
            x2 = currX - prevX;
            y1 = downY - prevY;
            y2 = currY - prevY;
            x1 = y1 * x2 / y2;

            intersectionPoints.bottom.push({
              x: xScale.invert(prevX + x1),
              y: downY
            });
          }
        };
      });

      return intersectionPoints;
    }

    protected _getResetYFunction() {
      // gets the y-value generator for the animation start point
      var yDomain = this.y().scale.domain();
      var domainMax = Math.max(yDomain[0], yDomain[1]);
      var domainMin = Math.min(yDomain[0], yDomain[1]);
      // start from zero, or the closest domain value to zero
      // avoids lines zooming on from offscreen.
      var startValue = (domainMax < 0 && domainMax) || (domainMin > 0 && domainMin) || 0;
      var scaledStartValue = this.y().scale.scale(startValue);
      return (d: any, i: number, dataset: Dataset) => scaledStartValue;
    }

    protected _generateDrawSteps(): Drawers.DrawStep[] {
      var drawSteps: Drawers.DrawStep[] = [];
      if (this._animateOnNextRender()) {
        var attrToProjector = this._generateAttrToProjector();
        attrToProjector["d"] = this._constructLineProjector(Plot._scaledAccessor(this.x()), this._getResetYFunction());
        drawSteps.push({attrToProjector: attrToProjector, animator: this._getAnimator(Plots.Animator.RESET)});
      }

      drawSteps.push({attrToProjector: this._generateAttrToProjector(), animator: this._getAnimator(Plots.Animator.MAIN)});

      return drawSteps;
    }

    protected _generateAttrToProjector() {
      var attrToProjector = super._generateAttrToProjector();
      Object.keys(attrToProjector).forEach((attribute: string) => {
        if (attribute === "d") { return; }
        var projector = attrToProjector[attribute];
        attrToProjector[attribute] = (data: any[], i: number, dataset: Dataset) =>
          data.length > 0 ? projector(data[0], i, dataset) : null;
      });

      return attrToProjector;
    }

    /**
     * Returns the PlotEntity nearest to the query point by X then by Y, or undefined if no PlotEntity can be found.
     *
     * @param {Point} queryPoint
     * @returns {PlotEntity} The nearest PlotEntity, or undefined if no PlotEntity can be found.
     */
    public entityNearest(queryPoint: Point): PlotEntity {
      var minXDist = Infinity;
      var minYDist = Infinity;
      var closest: PlotEntity;
      this.entities().forEach((entity) => {
        if (!this._entityVisibleOnPlot(entity.position, entity.datum, entity.index, entity.dataset)) {
          return;
        }
        var xDist = Math.abs(queryPoint.x - entity.position.x);
        var yDist = Math.abs(queryPoint.y - entity.position.y);

        if (xDist < minXDist || xDist === minXDist && yDist < minYDist) {
          closest = entity;
          minXDist = xDist;
          minYDist = yDist;
        }
      });

      return closest;
    }

    protected _propertyProjectors(): AttributeToProjector {
      var propertyToProjectors = super._propertyProjectors();
      propertyToProjectors["d"] = this._constructLineProjector(Plot._scaledAccessor(this.x()), Plot._scaledAccessor(this.y()));
      return propertyToProjectors;
    }

    protected _constructLineProjector(xProjector: Projector, yProjector: Projector) {
      var definedProjector = (d: any, i: number, dataset: Dataset) => {
        var positionX = Plot._scaledAccessor(this.x())(d, i, dataset);
        var positionY = Plot._scaledAccessor(this.y())(d, i, dataset);
        return positionX != null && !Utils.Math.isNaN(positionX) &&
               positionY != null && !Utils.Math.isNaN(positionY);
      };
      return (datum: any, index: number, dataset: Dataset) => {
        return d3.svg.line()
                     .x((innerDatum, innerIndex) => xProjector(innerDatum, innerIndex, dataset))
                     .y((innerDatum, innerIndex) => yProjector(innerDatum, innerIndex, dataset))
                     .interpolate(this.interpolator())
                     .defined((innerDatum, innerIndex) => definedProjector(innerDatum, innerIndex, dataset))(datum);
      };
    }

    protected _getDataToDraw() {
      var dataToDraw = new Utils.Map<Dataset, any[]> ();
      this.datasets().forEach((dataset) => dataToDraw.set(dataset, [dataset.data()]));
      return dataToDraw;
    }

  }
}
}
