void function InitSlider () {
    const AnimationTimingType = {
        LINEAR: 0,
        EASE_IN: 1,
        EASE_OUT: 2,
        EASE_IN_OUT: 3
    }

    const DEFAULT_TIME_DELAY = 4000
    const DEFAULT_MANUAL_CHANGE_PERC = 30

    // animation parameters
    const STEP_PERCENT = 6 // %
    const MAX_STEP = 50 // px

    const DEFAULT_MOTION_BLUR_SIZE = 0

    const EASE_IN_PERC = 15 // %
    const EASE_OUT_PERC = 25 // %

    class GSlider {
        constructor ({
            name = '',
            container,
            loop = true,
            autoplay = true,
            autoplayTimeDelay = DEFAULT_TIME_DELAY,
            manualChangePerc = DEFAULT_MANUAL_CHANGE_PERC,
            animationTiming = AnimationTimingType.EASE_OUT,
            motionBlurSize = DEFAULT_MOTION_BLUR_SIZE
        })
        {
            this.name = name

            this.container = container
            if (window.jQuery != null && container instanceof jQuery) {
                this.container = this.container[0]
            }

            this.slides = this.container.querySelectorAll('.g-slide')
            this.currentSlide = 0

            this.loop = loop

            this.autoplay = autoplay
            this.autoplayTimeDelay = autoplayTimeDelay

            this.animationTiming = animationTiming
            this.motionBlurSize = motionBlurSize

            this.manualChangePerc = manualChangePerc

            this.emitter = new EventEmitter()

            this._slideMoved = false

            this._currTransformOffset = 0
            this._mousedownTriggered = false

            this._clonedFirstSlide = null
            this._clonedLastSlide = null

            this._InitContainers()
            this._InitEvents()

            this._stopAnimation = false

            this._stopAutoplay = false
            if (this.autoplay) this.Autoplay()
        }

        get slideWidth () {
            return this.slides[0].clientWidth
        }
        get slideCount () {
            return this.slides.length
        }
        get lastSlideIndex () {
            return this.slideCount - 1
        }
        get maxOffset () {
            return this.lastSlideIndex * this.slideWidth
        }
        get currentOffsetByIndex () {
            return this.currentSlide * this.slideWidth
        }

        _InitContainers () {
            this.container.parentElement.style['overflow-x'] = 'hidden'

            this.container.style['display'] = 'flex'
            this.container.style['width'] = '100%'
            this.container.style['height'] = '100%'

            for (let i = 0; i < this.slideCount; i++) {
                let slide = this.slides[i]
                slide.style['position'] = 'relative'
                slide.style['width'] = '100%'
                slide.style['height'] = '100%'
                slide.style['overflow'] = 'hidden'
                slide.style['-webkit-flex-shrink'] = '0'
                slide.style['-ms-flex'] = '0 0 auto'
                slide.style['flex-shrink'] = '0'

                slide.setAttribute('slide-index', i)
            }

            if (this.loop && this.slideCount > 0) {
                this._CloneFirstSlide()
                this._SetTransformPosition()
            }

            let links = this.container.querySelectorAll('a')
            links.forEach(link => {
                link.style['-webkit-user-drag'] = 'none'
                link.style['-khtml-user-drag'] = 'none'
                link.style['-moz-user-drag'] = 'none'
                link.style['-o-user-drag'] = 'none'
                link.style['user-drag'] = 'none'

                link.style['-webkit-user-select'] = 'none'
                link.style['-moz-user-select'] = 'none'
                link.style['-ms-user-select'] = 'none'
                link.style['user-select'] = 'none'
            })
        }

        _InitEvents () {
            const moveOffset = 5
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

            var currX = null, startX = null

            this.container.addEventListener(!isMobile ? 'mousedown' : 'touchstart', (ev) => {
                if (this.slides.length === 0) return

                this._mousedownTriggered = true
                currX = !isMobile ? ev.pageX : ev.touches[0].pageX
                startX = currX

                document.body.style['user-select'] = 'none'

                this._slideMoved = false
            }, { passive: true })

            window.addEventListener(!isMobile ? 'mousemove' : 'touchmove', (ev) => {
                var pageX = !isMobile ? ev.pageX : ev.touches[0].pageX

                if (!this._mousedownTriggered) return
                if (!currX || pageX == currX) return

                if (this.slides.length === 0) {
                    this._FinishSliding()
                    return
                }

                var slowDownMin = !this.loop ? 0 : -this.slideWidth
                var slodDownMax = !this.loop ? this.maxOffset : this.slideWidth + this.maxOffset
                var shouldSlowDown = this._currTransformOffset < slowDownMin || this._currTransformOffset > slodDownMax

                if (shouldSlowDown) {
                    this._currTransformOffset += Math.floor((currX - pageX) / 4)
                }
                else {
                    this._currTransformOffset += (currX - pageX)
                }

                if (this.loop) {
                    if (this._currTransformOffset <= this.slideWidth) {
                        if (!this._clonedLastSlide) this._CloneLastSlide()
                    }
                    else if (this._currTransformOffset >= this.maxOffset) {
                        if (!this._clonedFirstSlide) this._CloneFirstSlide()
                    }
                }

                this._SetTransformPosition()

                currX = pageX

                this._slideMoved = this._slideMoved || Math.abs(startX - currX) > moveOffset

                if (this._slideMoved) {
                    this.container.querySelectorAll('a').forEach(link => {
                        link.style['pointer-events'] = 'none'
                    })
                }
            }, { passive: true })
            window.addEventListener(!isMobile ? 'mouseup' : 'touchend', () => {
                this._FinishSliding()
            }, { passive: true })
            window.addEventListener('resize', () => {
                this._StopAnimation()
                this._currTransformOffset = this.currentOffsetByIndex
                this._SetTransformPosition()
            }, { passive: true })
        }
        _FinishSliding () {
            if (!this._mousedownTriggered) return

            this._slideMoved = false
            this.container.querySelectorAll('a').forEach(link => {
                if (link.style.removeProperty) link.style.removeProperty('pointer-events')
                else link.style.removeAttribute('pointer-events')
            })

            document.body.style['user-select'] = ''

            this._mousedownTriggered = false

            var slideN = this._currTransformOffset / this.slideWidth
            var fractionalPartInPerc = Math.floor(Math.abs(slideN * 100 % 100))

            if (slideN > this.currentSlide && fractionalPartInPerc >= this.manualChangePerc) {
                slideN = Math.ceil(slideN)
            }
            else if (slideN < this.currentSlide && (100 - fractionalPartInPerc) >= this.manualChangePerc) {
                slideN = Math.floor(slideN)
            }
            else {
                slideN = this.currentSlide
            }

            this.ChangeSlide(slideN)
        }
        _AnimateSlider (slideIndex = this.currentSlide, callback = null) {
            this._stopAnimation = false

            var destOffset = slideIndex * this.slideWidth
            var diff = destOffset - this._currTransformOffset
            var step = Math.ceil(diff * STEP_PERCENT / 100)
            step = step < 0 ? Math.max(step, -MAX_STEP) : Math.min(step, MAX_STEP)

            var Animate = () => {
                if (this._stopAnimation || this._mousedownTriggered) {
                    FinishAnim()
                    return
                }

                var currDiff = destOffset - this._currTransformOffset
                var realStep = step

                // in case of ease-in or ease-in-out  animation timing functions
                if (this.animationTiming === AnimationTimingType.EASE_OUT || this.animationTiming === AnimationTimingType.EASE_IN_OUT) {
                    let diffPerc = currDiff * 100 / diff
                    if (diffPerc < EASE_OUT_PERC) {
                        realStep = step * diffPerc / EASE_OUT_PERC

                        if (realStep >= 0) {
                            realStep = Math.max(realStep, 1)
                        }
                        else {
                            realStep = Math.min(realStep, -1)
                        }
                    }
                }

                // in case of ease-out or ease-in-out animation timing functions
                if (this.animationTiming === AnimationTimingType.EASE_IN || this.animationTiming === AnimationTimingType.EASE_IN_OUT) {
                    let currPerc = 100 - currDiff * 100 / diff
                    if (currPerc < EASE_IN_PERC) {
                        realStep = step * currPerc / EASE_IN_PERC

                        if (realStep >= 0) {
                            realStep = Math.max(realStep, 1)
                        }
                        else {
                            realStep = Math.min(realStep, -1)
                        }
                    }
                }

                // motion blur
                if (!!this.motionBlurSize) {
                    let blurPerc = currDiff * 100 / (diff / 2)
                    if (blurPerc > 100) blurPerc = 200 - blurPerc
                    this._BlurSlides(blurPerc * this.motionBlurSize / 100)
                }

                var shouldEndAnimation = Math.abs(currDiff) - Math.abs(realStep) <= 0
                if (shouldEndAnimation) realStep = currDiff

                this._currTransformOffset += realStep

                this._SetTransformPosition()

                if (shouldEndAnimation) {
                    FinishAnim()
                    return
                }

                window.requestAnimationFrame(Animate)
            }

            var FinishAnim = () => {
                this._BlurSlides(0)
                callback && callback()
            }

            Animate()
        }
        _StopAnimation () {
            this._stopAnimation = true
        }

        _SetTransformPosition (offset = null) {
            if (offset == null) {
                offset = this._currTransformOffset
            }
            else {
                this._currTransformOffset = offset
            }

            var realOffset = this._currTransformOffset
            realOffset += (this._clonedLastSlide != null ? this.slideWidth : 0)

            this.container.style['transform'] = `translateX(${-realOffset}px)`
        }

        _BlurSlides (size) {
            for (let i = 0; i < this.slides.length; i++) {
                let slide = this.slides[i]

                if (!!size) {
                    slide.style['filter'] = `blur(${size}px)`
                    slide.style['filter'] = `blur(${size}px)`
                    slide.style['filter'] = `blur(${size}px)`
                }
                else {
                    slide.style['filter'] = ''
                    slide.style['filter'] = ''
                    slide.style['filter'] = ''
                }
            }
        }

        _CloneFirstSlide () {
            this._RemoveClonedFirstSlide()

            var firstSlide = this.slides[0]
            var lastSlide = this.slides[this.slides.length - 1]

            this._clonedFirstSlide = firstSlide.cloneNode(true)
            this._clonedFirstSlide.setAttribute('cloned', true)

            lastSlide.parentNode.insertBefore(this._clonedFirstSlide, lastSlide.nextSibling)
        }
        _CloneLastSlide () {
            this._RemoveClonedLastSlide()

            var firstSlide = this.slides[0]
            var lastSlide = this.slides[this.slides.length - 1]

            this._clonedLastSlide = lastSlide.cloneNode(true)
            this._clonedLastSlide.setAttribute('cloned', true)

            firstSlide.parentNode.insertBefore(this._clonedLastSlide, firstSlide)
        }
        _RemoveClonedFirstSlide () {
            if (!this._clonedFirstSlide) return
            this._clonedFirstSlide.remove()
            this._clonedFirstSlide = null
        }
        _RemoveClonedLastSlide () {
            if (!this._clonedLastSlide) return
            this._clonedLastSlide.remove()
            this._clonedLastSlide = null
        }

        ChangeSlide () {
            var arg = arguments[0]
            var isManual = true
            var callback = null

            if (typeof arguments[1] === 'boolean') {
                isManual = arguments[1] === false ? false : true
                callback = arguments[2] || null
            }
            else if (typeof arguments[1] === 'function') {
                callback = arguments[1]
            }

            if (typeof arg === 'function') {
                callback = arg
            }

            var targetSlide
            if (typeof arg === 'function' || arg === undefined || arg === true) {
                targetSlide = this.currentSlide + 1
            }
            else if (arg === false) {
                targetSlide = this.currentSlide - 1
            }
            else if (!isNaN(parseInt(arg))) {
                targetSlide = parseInt(arg)
            }
            else return

            targetSlide = Math.max(targetSlide, this.loop ? -1 : 0)
            targetSlide = Math.min(targetSlide, this.loop ? this.slideCount : this.lastSlideIndex)

            if (isManual) this.StopAutoplay()

            if (!isManual && targetSlide == this.currentSlide) {
                callback && callback(false)
                return
            }

            if ((targetSlide > this.lastSlideIndex || targetSlide < 0) && !this.loop) {
                callback && callback(false)
                return
            }

            switch (targetSlide) {
                case -1:
                    this.currentSlide = this.lastSlideIndex
                    break
                case this.slideCount:
                    this.currentSlide = 0
                    break
                default:
                    this.currentSlide = targetSlide
            }

            this.emitter.emit('slideChanged', this.currentSlide)

            this._AnimateSlider(targetSlide, () => {
                if (targetSlide === this.slideCount) {
                    this._RemoveClonedFirstSlide()
                    this._currTransformOffset = 0
                }
                else if (targetSlide === -1) {
                    this._RemoveClonedLastSlide()
                    this._currTransformOffset = this.maxOffset
                }

                if (this.loop) {
                    if (this.currentSlide === this.lastSlideIndex) this._CloneFirstSlide()
                    if (this.currentSlide === 0) this._CloneLastSlide()
                }

                this._SetTransformPosition()

                callback && callback(true)
            })
        }

        Autoplay () {
            this._stopAutoplay = false

            var lastCallTime = +new Date()

            var Autoplay = () => {
                if (this.container.parentNode == null) this.StopAutoplay() // container doesn't exists anymore

                if (this._stopAutoplay) return

                var currTime = +new Date()
                if (currTime - lastCallTime < this.autoplayTimeDelay) {
                    setTimeout(() => { window.requestAnimationFrame(Autoplay) }, Math.min(300, this.autoplayTimeDelay / 2))
                    return
                }
                else {
                    lastCallTime = currTime
                }

                if (this._mousedownTriggered) {
                    setTimeout(() => { window.requestAnimationFrame(Autoplay) }, Math.min(300, this.autoplayTimeDelay / 2))
                    return
                }

                this.ChangeSlide(true, false, () => {
                    setTimeout(() => { window.requestAnimationFrame(Autoplay) }, Math.min(300, this.autoplayTimeDelay / 2))
                })
            }

            Autoplay()
        }
        StopAutoplay () {
            this._stopAutoplay = true
        }
    }

    window.GSlider = GSlider
    window.AnimationTimingType = AnimationTimingType
}()
