import { createElement, Component } from 'preact' /** @jsx createElement */
import Status from './status'
import DropdownArrowDown from './dropdown-arrow-down'

const IS_PREACT = process.env.COMPONENT_LIBRARY === 'PREACT'
const IS_REACT = process.env.COMPONENT_LIBRARY === 'REACT'

const keyCodes = {
  13: 'enter',
  27: 'escape',
  32: 'space',
  38: 'up',
  40: 'down'
}

// Based on https://github.com/ausi/Feature-detection-technique-for-pointer-events
const hasPointerEvents = (() => {
  const element = document.createElement('x')
  element.style.cssText = 'pointer-events:auto'
  return element.style.pointerEvents === 'auto'
})()

function isIosDevice () {
  return !!(navigator.userAgent.match(/(iPod|iPhone|iPad)/g) && navigator.userAgent.match(/AppleWebKit/g))
}

function isPrintableKeyCode (keyCode) {
  return (
    (keyCode > 47 && keyCode < 58) || // number keys
    keyCode === 32 || keyCode === 8 || // spacebar or backspace
    (keyCode > 64 && keyCode < 91) || // letter keys
    (keyCode > 95 && keyCode < 112) || // numpad keys
    (keyCode > 185 && keyCode < 193) || // ;=,-./` (in order)
    (keyCode > 218 && keyCode < 223) // [\]' (in order)
  )
}

// Preact does not implement onChange on inputs, but React does.
function onChangeCrossLibrary (handler) {
  if (IS_PREACT) { return { onInput: handler } }
  if (IS_REACT) { return { onChange: handler } }
}

export default class Autocomplete extends Component {
  static defaultProps = {
    autoselect: false,
    cssNamespace: 'autocomplete',
    customAttributes: {},
    defaultValue: '',
    displayMenu: 'inline',
    minLength: 0,
    name: 'input-autocomplete',
    placeholder: '',
    onConfirm: () => {},
    onRemove: () => {},
    confirmOnBlur: true,
    showNoOptionsFound: true,
    showAllValues: false,
    required: false,
    multiple: false,
    selectedOptions: [],
    tNoResults: () => 'No results found',
    tSelectedOptionDescription: () => 'Press Enter or Space to remove selection',
    dropdownArrow: DropdownArrowDown
  }

  elementReferences = {}

  constructor (props) {
    super(props)

    this.state = {
      inputFocused: false,
      optionFocused: null,
      hovered: null,
      clicked: null,
      menuOpen: false,
      options: props.defaultValue ? [props.defaultValue] : [],
      selectedOptions: props.selectedOptions,
      query: props.defaultValue,
      selected: props.defaultValue ? 0 : null
    }

    this.handleComponentBlur = this.handleComponentBlur.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.handleUpArrow = this.handleUpArrow.bind(this)
    this.handleDownArrow = this.handleDownArrow.bind(this)
    this.handleEnter = this.handleEnter.bind(this)
    this.handlePrintableKey = this.handlePrintableKey.bind(this)

    this.handleListMouseLeave = this.handleListMouseLeave.bind(this)

    this.handleOptionBlur = this.handleOptionBlur.bind(this)
    this.handleOptionClick = this.handleOptionClick.bind(this)
    this.handleOptionFocus = this.handleOptionFocus.bind(this)
    this.handleOptionMouseEnter = this.handleOptionMouseEnter.bind(this)

    this.handleRemoveSelectedOptionClick = this.handleRemoveSelectedOptionClick.bind(this)

    this.handleInputBlur = this.handleInputBlur.bind(this)
    this.handleInputChange = this.handleInputChange.bind(this)
    this.handleInputFocus = this.handleInputFocus.bind(this)

    this.pollInputElement = this.pollInputElement.bind(this)
    this.getDirectInputChanges = this.getDirectInputChanges.bind(this)
  }

  componentDidMount () {
    this.pollInputElement()
  }

  componentWillUnmount () {
    clearTimeout(this.$pollInput)
    clearTimeout(this.$blurInput)
  }

  // Applications like Dragon NaturallySpeaking will modify the
  // `input` field by directly changing its `.value`. These events
  // don't trigger our JavaScript event listeners, so we need to poll
  // to handle when and if they occur.
  pollInputElement () {
    this.getDirectInputChanges()
    this.$pollInput = setTimeout(() => {
      this.pollInputElement()
    }, 100)
  }

  getDirectInputChanges () {
    const inputReference = this.elementReferences['input']
    const queryHasChanged = inputReference && inputReference.value !== this.state.query

    if (queryHasChanged) {
      this.handleInputChange({ target: { value: inputReference.value } })
    }
  }

  componentDidUpdate (prevProps, prevState) {
    const { inputFocused, optionFocused } = this.state
    if (inputFocused) {
      const inputElement = this.elementReferences['input']
      if (inputElement !== document.activeElement) { inputElement.focus() }
      const notPreviouslyFocused = !prevState.inputFocused && prevState.optionFocused === null
      if (notPreviouslyFocused) {
        inputElement.setSelectionRange(0, inputElement.value.length)
      }
    } else if (optionFocused !== null) {
      const optionElement = this.elementReferences[`option-${optionFocused}`]
      if (optionElement && optionElement !== document.activeElement) {
        optionElement.focus()
      }
    }
  }

  hasAutoselect () {
    return isIosDevice() ? false : this.props.autoselect
  }

  // This template is used when converting from a state.options object into a state.query.
  templateInputValue (value) {
    const inputValueTemplate = this.props.templates && this.props.templates.inputValue
    return inputValueTemplate ? inputValueTemplate(value) : value
  }

  // This template is used when displaying results / suggestions.
  templateSuggestion (value) {
    const suggestionTemplate = this.props.templates && this.props.templates.suggestion
    return suggestionTemplate ? suggestionTemplate(value) : value
  }

  resetInput () {
    this.setState({
      inputFocused: false,
      optionFocused: null,
      clicked: null,
      menuOpen: false,
      selected: null,
      query: ''
    })
  }

  handleComponentBlur (newState) {
    const { options, query, selected } = this.state
    let newQuery
    if (this.props.confirmOnBlur) {
      newQuery = newState.query || query
      this.props.onConfirm(options[selected])
    } else {
      newQuery = query
    }

    if (this.props.multiple) {
      this.resetInput()
    } else {
      this.setState({
        inputFocused: false,
        optionFocused: null,
        clicked: null,
        menuOpen: newState.menuOpen || false,
        query: newQuery
      })
    }
  }

  handleListMouseLeave (event) {
    this.setState({
      hovered: null
    })
  }

  handleOptionBlur (event, index) {
    const { optionFocused, clicked, menuOpen, options, selected } = this.state
    const focusingOutsideComponent = event.relatedTarget === null && clicked === null
    const focusingInput = event.relatedTarget === this.elementReferences['input']
    const focusingAnotherOption = optionFocused !== null && optionFocused !== index
    const blurComponent = (!focusingAnotherOption && focusingOutsideComponent) || !(focusingAnotherOption || focusingInput)
    if (blurComponent) {
      const keepMenuOpen = menuOpen && isIosDevice()
      this.handleComponentBlur({
        menuOpen: keepMenuOpen,
        query: this.templateInputValue(options[selected])
      })
    }
  }

  handleInputBlur (event) {
    const { optionFocused, menuOpen, options, query, selected } = this.state
    const focusingAnOption = optionFocused !== null
    clearTimeout(this.$blurInput)
    if (!focusingAnOption) {
      const keepMenuOpen = menuOpen && isIosDevice()
      const newQuery = isIosDevice() ? query : this.templateInputValue(options[selected])
      this.$blurInput = setTimeout(() => this.handleComponentBlur({
        menuOpen: keepMenuOpen,
        query: newQuery
      }), 200)
    }
  }

  handleInputChange (event) {
    const { minLength, source, showAllValues } = this.props
    const autoselect = this.hasAutoselect()
    const query = event.target.value
    const queryEmpty = query.length === 0
    const queryChanged = this.state.query.length !== query.length
    const queryLongEnough = query.length >= minLength

    this.setState({ query })

    const searchForOptions = showAllValues || (!queryEmpty && queryChanged && queryLongEnough)
    if (searchForOptions) {
      source(query, (options) => {
        const optionsAvailable = options.length > 0
        this.setState({
          menuOpen: optionsAvailable,
          options,
          selected: (autoselect && optionsAvailable) ? 0 : null
        })
      })
    } else if (queryEmpty || !queryLongEnough) {
      this.setState({
        menuOpen: false,
        options: [],
        selected: null
      })
    }
  }

  handleInputClick (event) {
    this.handleInputChange(event)
  }

  handleInputFocus (event) {
    this.setState({
      inputFocused: true,
      optionFocused: null
    })
  }

  handleOptionFocus (index) {
    this.setState({
      inputFocused: false,
      optionFocused: index,
      hovered: null,
      selected: index
    })
  }

  handleOptionMouseEnter (event, index) {
    // iOS Safari prevents click event if mouseenter adds hover background colour
    // See: https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW4
    if (!isIosDevice()) {
      this.setState({
        hovered: index
      })
    }
  }

  handleOptionClick (event, index) {
    const selectedOption = this.state.options[index]
    const newQuery = this.templateInputValue(selectedOption)
    clearTimeout(this.$blurInput)
    this.props.onConfirm(selectedOption)

    if (this.props.multiple) {
      this.resetInput()
      if (this.state.selectedOptions.indexOf(selectedOption) === -1) {
        this.setState({
          selectedOptions: this.state.selectedOptions.concat([selectedOption])
        })
      }
    } else {
      this.setState({
        inputFocused: true,
        optionFocused: null,
        clicked: index,
        hovered: null,
        menuOpen: false,
        query: newQuery,
        selected: index
      })
    }
  }

  handleRemoveSelectedOptionClick (event, index) {
    const selectedOptions = this.state.selectedOptions
    const toRemove = selectedOptions[index]
    if (toRemove) {
      const newSelectedOptions = selectedOptions.filter(o => o !== toRemove)

      this.setState({
        selectedOptions: newSelectedOptions
      })

      this.props.onRemove(toRemove)
    }
  }

  handleUpArrow (event) {
    event.preventDefault()
    const { menuOpen, selected } = this.state
    if (!menuOpen) { return }

    const hasOptions = selected && selected > 0
    if (hasOptions) {
      this.handleOptionFocus(selected - 1)
    } else {
      this.setState({
        inputFocused: true,
        optionFocused: null,
        selected: null
      })
    }
  }

  handleDownArrow (event) {
    event.preventDefault()
    // if not open, open
    if (this.props.showAllValues && this.state.menuOpen === false) {
      event.preventDefault()
      this.props.source('', (options) => {
        this.setState({
          menuOpen: true,
          options,
          selected: 0,
          inputFocused: false,
          optionFocused: 0,
          hovered: null
        })
      })
    } else if (this.state.menuOpen === true) {
      const { options, selected } = this.state
      const isAtBottom = selected === options.length - 1
      if (!isAtBottom) {
        this.handleOptionFocus(selected === null ? 0 : selected + 1)
      }
    }
  }

  handleSpace (event) {
    // if not open, open
    if (this.props.showAllValues && this.state.menuOpen === false && this.state.query === '') {
      event.preventDefault()
      this.props.source('', (options) => {
        this.setState({
          menuOpen: true,
          options
        })
      })
    }
    const focusIsOnOption = this.state.optionFocused !== null
    if (focusIsOnOption) {
      event.preventDefault()
      this.handleOptionClick(event, this.state.optionFocused)
    }
  }

  handleEnter (event) {
    const { menuOpen, selected } = this.state
    if (menuOpen) {
      event.preventDefault()
      const hasSelectedOption = selected !== null && selected > -1
      if (hasSelectedOption) {
        this.handleOptionClick(event, selected)
      }
    }
  }

  handlePrintableKey (event) {
    const inputElement = this.elementReferences['input']
    const eventIsOnInput = event.target === inputElement
    if (!eventIsOnInput) {
      // FIXME: This would be better if it was in componentDidUpdate,
      // but using setState to trigger that seems to not work correctly
      // in preact@8.1.0.
      inputElement.focus()
    }
  }

  handleKeyDown (event) {
    switch (keyCodes[event.keyCode]) {
      case 'up':
        this.handleUpArrow(event)
        break
      case 'down':
        this.handleDownArrow(event)
        break
      case 'space':
        this.handleSpace(event)
        break
      case 'enter':
        this.handleEnter(event)
        break
      case 'escape':
        this.handleComponentBlur({
          query: this.state.query
        })
        break
      default:
        if (isPrintableKeyCode(event.keyCode)) {
          this.handlePrintableKey(event)
        }
        break
    }
  }

  render () {
    const {
      cssNamespace,
      displayMenu,
      id,
      minLength,
      name,
      placeholder,
      required,
      multiple,
      showAllValues,
      tNoResults,
      tStatusQueryTooShort,
      tStatusNoResults,
      tStatusSelectedOption,
      tStatusResults,
      tSelectedOptionDescription,
      dropdownArrow: dropdownArrowFactory,
      customAttributes
    } = this.props
    const {
      inputFocused,
      optionFocused,
      hovered,
      menuOpen,
      options,
      query,
      selected,
      selectedOptions
    } = this.state

    const autoselect = this.hasAutoselect()

    const noOptionsAvailable = options.length === 0
    const queryNotEmpty = query.length !== 0
    const queryLongEnough = query.length >= minLength
    const showNoOptionsFound = this.props.showNoOptionsFound &&
      inputFocused && noOptionsAvailable && queryNotEmpty && queryLongEnough

    const wrapperClassName = `${cssNamespace}__wrapper`

    const inputClassName = `${cssNamespace}__input`
    const componentIsFocused = inputFocused || optionFocused !== null
    const inputModifierFocused = componentIsFocused ? ` ${inputClassName}--focused` : ''
    const inputModifierType = this.props.showAllValues ? ` ${inputClassName}--show-all-values` : ` ${inputClassName}--default`
    const dropdownArrowClassName = `${cssNamespace}__dropdown-arrow-down`

    const menuClassName = `${cssNamespace}__menu`
    const menuModifierDisplayMenu = `${menuClassName}--${displayMenu}`
    const menuIsVisible = menuOpen || showNoOptionsFound
    const menuModifierVisibility = `${menuClassName}--${(menuIsVisible) ? 'visible' : 'hidden'}`

    const optionClassName = `${cssNamespace}__option`

    const selectedOptionsClassName = `${cssNamespace}__list`

    const hintClassName = `${cssNamespace}__hint`
    const selectedOptionText = this.templateInputValue(options[selected])
    const optionBeginsWithQuery = selectedOptionText &&
      selectedOptionText.toLowerCase().indexOf(query.toLowerCase()) === 0
    const hintValue = (optionBeginsWithQuery && autoselect)
      ? query + selectedOptionText.substr(query.length)
      : ''
    const showHint = hasPointerEvents && hintValue

    let dropdownArrow

    // we only need a dropdown arrow if showAllValues is set to a truthy value
    if (showAllValues) {
      dropdownArrow = dropdownArrowFactory({ className: dropdownArrowClassName })

      // if the factory returns a string we'll render this as HTML (usage w/o (P)React)
      if (typeof dropdownArrow === 'string') {
        dropdownArrow = <div className={`${cssNamespace}__dropdown-arrow-down-wrapper`} dangerouslySetInnerHTML={{ __html: dropdownArrow }} />
      }
    }

    return (
      <div className={wrapperClassName} onKeyDown={this.handleKeyDown} role='combobox' aria-expanded={menuOpen ? 'true' : 'false'}>
        <Status
          length={options.length}
          queryLength={query.length}
          minQueryLength={minLength}
          selectedOption={this.templateInputValue(options[selected])}
          selectedOptionIndex={selected}
          tQueryTooShort={tStatusQueryTooShort}
          tNoResults={tStatusNoResults}
          tSelectedOption={tStatusSelectedOption}
          tResults={tStatusResults}
        />

        {showHint && (
          <span><input className={hintClassName} readonly tabIndex='-1' value={hintValue} /></span>
        )}

        <input
          aria-activedescendant={optionFocused !== null ? `${id}__option--${optionFocused}` : false}
          aria-owns={`${id}__listbox`}
          autoComplete='off'
          className={`${inputClassName}${inputModifierFocused}${inputModifierType}`}
          id={id}
          onClick={(event) => this.handleInputClick(event)}
          onBlur={this.handleInputBlur}
          {...onChangeCrossLibrary(this.handleInputChange)}
          onFocus={this.handleInputFocus}
          name={name}
          placeholder={placeholder}
          ref={(inputElement) => { this.elementReferences['input'] = inputElement }}
          type='text'
          role='textbox'
          required={required}
          value={query}
          {...customAttributes}
        />

        {dropdownArrow}

        <ul
          className={`${menuClassName} ${menuModifierDisplayMenu} ${menuModifierVisibility}`}
          onMouseLeave={(event) => this.handleListMouseLeave(event)}
          id={`${id}__listbox`}
          role='listbox'
        >
          {options.map((option, index) => {
            const showFocused = inputFocused ? selected === index : optionFocused === index
            const optionModifierFocused = showFocused && hovered === null ? ` ${optionClassName}--focused` : ''
            const optionModifierOdd = (index % 2) ? ` ${optionClassName}--odd` : ''

            return (
              <li
                aria-selected={optionFocused === index}
                className={`${optionClassName}${optionModifierFocused}${optionModifierOdd}`}
                dangerouslySetInnerHTML={{ __html: this.templateSuggestion(option) }}
                id={`${id}__option--${index}`}
                key={index}
                onBlur={(event) => this.handleOptionBlur(event, index)}
                onClick={(event) => this.handleOptionClick(event, index)}
                onMouseEnter={(event) => this.handleOptionMouseEnter(event, index)}
                ref={(optionEl) => { this.elementReferences[`option-${index}`] = optionEl }}
                role='option'
                tabIndex='-1'
              />
            )
          })}

          {showNoOptionsFound && (
            <li className={`${optionClassName} ${optionClassName}--no-results`}>{tNoResults()}</li>
          )}
        </ul>

        {multiple && selectedOptions.length > 0 && (
          <ul
            className={`${selectedOptionsClassName}`}
            id={`${id}__list`}
          >
            {selectedOptions.map((option, index) => {
              return (
                <li id={`${id}__selected-option--${index}`} className='autocomplete__selected-option'>
                  <span dangerouslySetInnerHTML={{ __html: this.templateSuggestion(option) }} />
                  <button
                    type='button'
                    className='autocomplete__remove-option'
                    aria-label={`${this.templateSuggestion(option)}, selected. ${tSelectedOptionDescription()}`}
                    onClick={(event) => this.handleRemoveSelectedOptionClick(event, index)}>remove</button>
                </li>
              )
            })}
            {showNoOptionsFound && (
              <li className={`${optionClassName} ${optionClassName}--no-results`}>{tNoResults()}</li>
            )}
          </ul>
        )}
      </div>
    )
  }
}
