/* global before, beforeEach, after, describe, expect, it */
import accessibleAutocomplete from '../../src/wrapper'

const DEFAULT_OPTIONS = {
  '': 'Select',
  fr: 'France',
  de: 'Germany',
  gb: 'United Kingdom of Great Britain & Northern Ireland'
}

const injectSelectToEnhanceIntoDOM = (element, settings) => {
  settings = settings || {}
  settings.options = settings.options || DEFAULT_OPTIONS
  settings.id = settings.id !== undefined ? settings.id : 'location-picker-id'
  settings.name = settings.name !== undefined ? settings.name : 'location-picker-name'
  var $select = document.createElement('select')
  if (settings.id) {
    $select.id = settings.id
  }
  if (settings.name) {
    $select.name = settings.name
  }
  if (settings.multiple) {
    $select.multiple = settings.multiple
  }

  if (settings.multiple) {
    const selected = settings.selected || []
    Object.keys(settings.options)
      .map(optionKey => {
        const option = document.createElement('option')
        option.value = optionKey
        option.text = settings.options[optionKey]
        option.selected = selected.indexOf(optionKey) !== -1
        return option
      })
      .forEach(option => $select.appendChild(option))
  } else {
    Object.keys(settings.options)
      .map(optionKey => {
        const option = document.createElement('option')
        option.value = optionKey
        option.text = settings.options[optionKey]
        option.selected = (settings.selected === optionKey)
        return option
      })
      .forEach(option => $select.appendChild(option))
  }

  element.appendChild($select)

  return $select
}

describe('Wrapper', () => {
  let scratch
  before(() => {
    scratch = document.createElement('div');
    (document.body || document.documentElement).appendChild(scratch)
  })

  beforeEach(() => {
    scratch.innerHTML = ''
  })

  after(() => {
    scratch.parentNode.removeChild(scratch)
    scratch = null
  })

  it('throws an error when called on nonexistent element', () => {
    expect(
      accessibleAutocomplete.bind(null, {
        element: document.querySelector('#nothing-container'),
        id: 'scratch',
        source: () => {}
      })
    ).to.throw('element is not defined')
  })

  it('throws an error when called without an id ', () => {
    expect(
      accessibleAutocomplete.bind(null, {
        element: scratch,
        source: () => {}
      })
    ).to.throw('id is not defined')
  })

  it('throws an error when called without a source', () => {
    expect(
      accessibleAutocomplete.bind(null, {
        element: scratch,
        id: 'scratch'
      })
    ).to.throw('source is not defined')
  })

  it('throws an error when called on nonexistent selectElement', () => {
    expect(
      accessibleAutocomplete.enhanceSelectElement.bind(null, {
        selectElement: document.querySelector('#nothing')
      })
    ).to.throw('selectElement is not defined')
  })

  it('can enhance a select element', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch)
    const id = select.id

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    expect(autocompleteInstances.length).to.equal(1)

    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    expect(autocompleteInput.tagName.toLowerCase()).to.equal('input')
    expect(autocompleteInput.id).to.equal(id)
  })

  it('can enhance a select multiple element', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { multiple: true })
    const id = select.id

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    expect(autocompleteInstances.length).to.equal(1)

    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    const autocompleteList = autocompleteInstance.querySelector('.autocomplete__list')
    expect(autocompleteInput.tagName.toLowerCase()).to.equal('input')
    expect(autocompleteInput.id).to.equal(id)
    expect(autocompleteList).to.equal(null)
  })

  it('uses the defaultValue setting to populate the input field if no option is selected', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: '' })
    accessibleAutocomplete.enhanceSelectElement({
      defaultValue: '',
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    expect(autocompleteInput.value).to.equal('')
  })

  it('uses the option label as the default input element value if an option is selected', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: 'de' })
    accessibleAutocomplete.enhanceSelectElement({
      defaultValue: '',
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    expect(autocompleteInput.value).to.equal('Germany')
  })

  it('plays back the selected options when enhancing a select multiple', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: ['de', 'fr'], multiple: true })

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteSelectedItems = autocompleteInstance.querySelectorAll('ul.autocomplete__list li.autocomplete__selected-option')
    expect(autocompleteSelectedItems.length).to.equal(2)
    expect(autocompleteSelectedItems[0].textContent).to.contain('France')
    expect(autocompleteSelectedItems[1].textContent).to.contain('Germany')
  })

  it('can make selections when enhancing a select multiple', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: ['fr'], multiple: true })

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstance = document.querySelector('.autocomplete__wrapper')
    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')

    autocompleteInput.value = 'Germany'
    setTimeout(() => {
      const autocompleteOption = autocompleteInstance.querySelector('.autocomplete__option')
      expect(autocompleteOption.textContent).to.equal('Germany')
      autocompleteOption.click()

      const selectedOptions = select.querySelectorAll('option:checked')
      expect(selectedOptions.length).to.equal(2)
      expect(selectedOptions[0].textContent).to.equal('France')
      expect(selectedOptions[1].textContent).to.equal('Germany')
      done()
    }, 250)
  })

  it('can remove selections when enhancing a select multiple', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: ['de', 'fr'], multiple: true })

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstance = document.querySelectorAll('.autocomplete__wrapper')[0]
    const removeFrance = autocompleteInstance.querySelector('.autocomplete__remove-option')
    removeFrance.click()

    setTimeout(() => {
      const autocompleteSelectedItems = autocompleteInstance.querySelectorAll('.autocomplete__list li')
      expect(autocompleteSelectedItems.length).to.equal(1)
      expect(autocompleteSelectedItems[0].textContent).to.contain('Germany')

      const selectedOptions = select.querySelectorAll('option:checked')
      expect(selectedOptions.length).to.equal(1)
      expect(selectedOptions[0].textContent).to.equal('Germany')

      done()
    }, 250)
  })

  it('gives the autocomplete element a blank name attribute by default', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch)

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')

    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    expect(autocompleteInput.name).to.equal('')
  })

  it('can define a name for the autocomplete element', () => {
    const select = injectSelectToEnhanceIntoDOM(scratch)

    accessibleAutocomplete.enhanceSelectElement({
      name: 'location-picker-autocomplete',
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')

    const autocompleteInstance = autocompleteInstances[0]

    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    expect(autocompleteInput.name).to.equal('location-picker-autocomplete')
  })

  it('does not include "null" options in autocomplete', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch)

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]
    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')

    // Using setTimeouts here since changes in values take a while to reflect in lists
    autocompleteInput.value = 'e'
    setTimeout(() => {
      const autocompleteOptions = autocompleteInstance.querySelectorAll('.autocomplete__option')
      expect(autocompleteOptions.length).to.equal(3)
      expect([].map.call(autocompleteOptions, o => o.textContent)).not.to.contain('Select')
      done()
    }, 250)
  })

  it('includes "null" options in autocomplete if `preserveNullOptions` flag is true', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch)

    accessibleAutocomplete.enhanceSelectElement({
      preserveNullOptions: true,
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]
    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')

    // Using setTimeouts here since changes in values take a while to reflect in lists
    autocompleteInput.value = 'e'
    setTimeout(() => {
      const autocompleteOptions = autocompleteInstance.querySelectorAll('.autocomplete__option')
      expect(autocompleteOptions.length).to.equal(4)
      expect([].map.call(autocompleteOptions, o => o.textContent)).to.contain('Select')
      done()
    }, 250)
  })

  it('has all options when typing', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch)

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]
    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    const autocompleteOption = autocompleteInstance.querySelector('.autocomplete__option')

    // Using setTimeouts here since changes in values take a while to reflect in lists
    autocompleteInput.value = 'Fran'
    setTimeout(() => {
      expect(autocompleteOption.textContent).to.equal('France')
      autocompleteInput.value = 'Ger'
      setTimeout(() => {
        expect(autocompleteOption.textContent).to.equal('Germany')
        autocompleteInput.value = 'United'
        setTimeout(() => {
          const autocompleteHint = autocompleteInstance.querySelector('.autocomplete__hint')
          expect(autocompleteOption.textContent).to.equal('United Kingdom of Great Britain & Northern Ireland')
          expect(autocompleteHint.value).to.equal('United Kingdom of Great Britain & Northern Ireland')
          done()
        }, 250)
      }, 250)
    }, 250)
  })

  it('onConfirm updates original select', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: 'de' })

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstances = document.querySelectorAll('.autocomplete__wrapper')
    const autocompleteInstance = autocompleteInstances[0]
    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')
    const autocompleteOption = autocompleteInstance.querySelector('.autocomplete__option')

    // Check the initial value of the original selectElement
    expect(select.value).to.equal('de')
    // Using setTimeouts here since changes in values take a while to reflect in lists
    autocompleteInput.value = 'United'
    setTimeout(() => {
      expect(autocompleteOption.textContent).to.equal('United Kingdom of Great Britain & Northern Ireland')
      autocompleteOption.click()
      expect(select.value).to.equal('gb')
      setTimeout(() => {
        expect(autocompleteInput.value).to.equal('United Kingdom of Great Britain & Northern Ireland')
        done()
      }, 250)
    }, 250)
  })

  it('onConfirm selects blank option when available', (done) => {
    const select = injectSelectToEnhanceIntoDOM(scratch, { selected: 'de' })

    accessibleAutocomplete.enhanceSelectElement({
      selectElement: select
    })

    const autocompleteInstance = document.querySelectorAll('.autocomplete__wrapper')[0]
    const autocompleteInput = autocompleteInstance.querySelector('.autocomplete__input')

    autocompleteInput.value = ''
    autocompleteInput.dispatchEvent(new window.Event('blur'))
    setTimeout(() => {
      expect(autocompleteInput.textContent).to.equal('')
      expect(select.value).to.equal('')
      done()
    }, 500)
  })
})
