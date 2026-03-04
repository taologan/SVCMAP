import L from 'leaflet'

// Smooth wheel zoom handler (adapted from Leaflet.SmoothWheelZoom by mutsuyuki at https://github.com/mutsuyuki/Leaflet.SmoothWheelZoom).
// Enable per-map via:
//   scrollWheelZoom: false,
//   smoothWheelZoom: true,
//   smoothSensitivity: 1,
L.Map.mergeOptions({
  smoothWheelZoom: false,
  smoothSensitivity: 1,
})

L.Map.SmoothWheelZoom = L.Handler.extend({
  addHooks() {
    L.DomEvent.on(this._map._container, 'wheel', this._onWheelScroll, this)
  },

  removeHooks() {
    L.DomEvent.off(this._map._container, 'wheel', this._onWheelScroll, this)
    this._isWheeling = false
    this._stop()
  },

  _onWheelScroll(e) {
    if (!this._isWheeling) {
      this._onWheelStart(e)
    }
    this._onWheeling(e)
  },

  _onWheelStart(e) {
    const map = this._map
    this._isWheeling = true
    this._moved = false
    this._wheelMousePosition = map.mouseEventToContainerPoint(e)
    this._centerPoint = map.getSize()._divideBy(2)
    this._startLatLng = map.containerPointToLatLng(this._centerPoint)
    this._wheelStartLatLng = map.containerPointToLatLng(this._wheelMousePosition)

    map._stop()
    if (map._panAnim) map._panAnim.stop()

    this._goalZoom = map.getZoom()
    this._prevCenter = map.getCenter()
    this._prevZoom = map.getZoom()

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this))
  },

  _onWheeling(e) {
    const map = this._map
    const sensitivity = typeof map.options.smoothSensitivity === 'number' ? map.options.smoothSensitivity : 1
    this._goalZoom = map._limitZoom(this._goalZoom + L.DomEvent.getWheelDelta(e) * 0.003 * sensitivity)
    this._wheelMousePosition = map.mouseEventToContainerPoint(e)

    clearTimeout(this._timeoutId)
    this._timeoutId = setTimeout(this._onWheelEnd.bind(this), 200)

    L.DomEvent.preventDefault(e)
    L.DomEvent.stopPropagation(e)
  },

  _onWheelEnd() {
    if (!this._isWheeling) return
    this._isWheeling = false
    this._stop()
    if (this._moved) this._map._moveEnd(true)
  },

  _stop() {
    clearTimeout(this._timeoutId)
    this._timeoutId = null
    cancelAnimationFrame(this._zoomAnimationId)
    this._zoomAnimationId = null
  },

  _updateWheelZoom() {
    const map = this._map
    if (!this._isWheeling) return

    if (!map.getCenter().equals(this._prevCenter) || map.getZoom() !== this._prevZoom) {
      this._onWheelEnd()
      return
    }

    const currentZoom = map.getZoom()
    const nextZoom = Math.floor((currentZoom + (this._goalZoom - currentZoom) * 0.3) * 100) / 100

    if (Math.abs(nextZoom - currentZoom) >= 0.005) {
      const delta = this._wheelMousePosition.subtract(this._centerPoint)
      const center =
        map.options.smoothWheelZoom === 'center' || (delta.x === 0 && delta.y === 0)
          ? this._startLatLng
          : map.unproject(map.project(this._wheelStartLatLng, nextZoom).subtract(delta), nextZoom)

      if (!this._moved) {
        map._moveStart(true, false)
        this._moved = true
      }

      map._move(center, nextZoom)
      map.fire('smoothzoom')
      this._prevCenter = map.getCenter()
      this._prevZoom = map.getZoom()
    }

    this._zoomAnimationId = requestAnimationFrame(this._updateWheelZoom.bind(this))
  },
})

L.Map.addInitHook('addHandler', 'smoothWheelZoom', L.Map.SmoothWheelZoom)