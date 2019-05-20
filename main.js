/* global $ M */

// real-world melanic frequencies: 1848 = 2%, 1895 = 95%

// ======== CONSTANTS & GLOBALS ========
const TIME_TO_FULL_SOOTINESS = 20
const RANDOM_VARIANCE = 0.5

let sootiness = 0 // how sooty the trees are, from 0 to 1
/**
 * Contins all active moths.
 * @type {Moth[]}
 */
let moths = []
let globalId = 0 // incrementing ID for added moths
const BarkType = Object.freeze({
  'dynamic': 0,
  'clean': 1,
  'sooty': 2
})
let barkType = BarkType.dynamic
let pendingStop = false
// ===========================

class Moth {
  constructor (id, color) {
    this.id = id
    this.color = color
  }
}

$(document).ready(function () {
  M.AutoInit()
})

$('.moth-pop-adj').click(function () {
  let id = $(this).attr('id')

  let valInput = $('#moth-pop-no')
  let curVal = parseInt(valInput.val())
  if (id === 'moth-pop-adj-up') {
    valInput.val(curVal + 10)
  } else if (id === 'moth-pop-adj-down') {
    valInput.val(curVal - 10)
  }

  setPlayButtonDisabled(true)
  if (curVal - 10 < 20) {
    $('#moth-pop-adj-down').addClass('disabled')
  } else {
    $('#moth-pop-adj-down').removeClass('disabled')
  }
  resetSimulation()
})

$('#mothify-button').click(function () {
  resetSimulation()
  generateStartingMoths()
  updateCounts()
  setPlayButtonDisabled(false)
})

$('#restart-button').click(function () {
  resetSimulation()
})

$('#phenotype-distro').change(function () {
  resetSimulation()
})

$('input[name="bark-type"]').change(function () {
  let val = $(this).val()
  switch (val) {
    case 'dynamic':
      barkType = BarkType.dynamic
      break
    case 'clean':
      barkType = BarkType.clean
      break
    case 'sooty':
      barkType = BarkType.sooty
      break
  }
  updateBark()
  resetSimulation()
})

$('#start-button').click(function () {
  let state = !getPlayButtonState()
  if (!state) {
    pendingStop = false
    setPlayButtonState(state)
    toggleControls(state)
    runSimulationYear()
  } else {
    pendingStop = true
  }
})

$('#predator-voracity').change(function () {
  resetSimulation()
})

function runSimulationYear () {
  if (getTimeIndex() >= 50) {
    postStop()
    return
  }

  let curDarkMoths = getDarkMoths()
  let curLightMoths = getLightMoths()

  let voracityConstant = Math.pow(parseInt($('#predator-voracity').val()) * 3 / 20, 2) // the model says 0.04 is a good middleground for 100 years—we need to be faster
  let sootinessConstant = Math.pow(sootiness, 2.25) // this helps make it take a little longer for evolution to "catch up"
  let randomVariance = randInRange(-RANDOM_VARIANCE, RANDOM_VARIANCE)

  let lightPopToEat = Math.round(sootinessConstant * voracityConstant * curLightMoths.length + randomVariance)
  let darkPopToEat = Math.round((voracityConstant - (sootiness * voracityConstant)) * curDarkMoths.length - randomVariance)

  if (darkPopToEat < 0) lightPopToEat += Math.abs(darkPopToEat)
  if (lightPopToEat < 0) darkPopToEat += Math.abs(lightPopToEat)

  for (let i = 0; i < darkPopToEat; ++i) {
    if (i < curDarkMoths.length) {
      stageMothForEating(curDarkMoths[i].id)
      stageMothForBirth('light')
      curDarkMoths.splice(i, 1)
    } else {
      break
    }
  }
  for (let i = 0; i < lightPopToEat; ++i) {
    if (i < curLightMoths.length) {
      stageMothForEating(curLightMoths[i].id)
      stageMothForBirth('dark')
      curLightMoths.splice(i, 1)
    } else {
      break
    }
  }

  window.setTimeout(function () {
    actualizeStaging()
    setTimeIndex(getTimeIndex() + 1)
    updateBark()
    if (getTimeIndex() < 50 && !pendingStop) {
      runSimulationYear()
    } else {
      postStop()
    }
  }, 250)
}

/**
 * Prepares a moth to be "eaten" by displaying a visual change.
 * @param {number} mothId ID of the moth to be eaten.
 */
function stageMothForEating (mothId) {
  getMothElById(mothId).addClass('to-eat')
  deleteMothById(mothId)
}

/**
 * Appends a moth to the array and adds it to the document, but keeps it hidden.
 * @param {String} color the color of the moth to stage.
 */
function stageMothForBirth (color) {
  appendMoth(color, true)
}

/**
 * Removes staged eating moths by class name and displays staged birthed moths.
 */
function actualizeStaging () {
  $('.moth.hidden').removeClass('hidden')
  $('.to-eat').remove()
  updateCounts()
}

function generateStartingMoths () {
  clearMoths()
  let totalNumber = parseInt($('#moth-pop-no').val())
  let numberDark = Math.round(parseInt($('#phenotype-distro').val()) / 100 * totalNumber)
  let numberLight = totalNumber - numberDark

  for (let i = 0; i < numberDark; ++i) {
    appendMoth('dark')
  }
  for (let i = 0; i < numberLight; ++i) {
    appendMoth('light')
  }
}

/**
 * Updates bark appearance based on current sootiness.
 */
function updateBark () {
  switch (barkType) {
    case BarkType.dynamic:
      sootiness = Math.min(getTimeIndex() / TIME_TO_FULL_SOOTINESS, 1)
      break
    case BarkType.clean:
      sootiness = 0
      break
    case BarkType.sooty:
      sootiness = 1
      break
  }
  $('.light-bark').css('opacity', 1 - sootiness)
  $('.dark-bark').css('opacity', 1)
}

/**
 * Adds a moth to the "canvas" at a random location.
 * @param {string} color the color of the moth, either 'light' or 'dark.'
 * @param {boolean} hidden whether the moth should be hidden to start.
 * @returns {Number} the ID of the newly created moth.
 */
function appendMoth (color, hidden = false) {
  let moth = $('<img class="moth">')
  moth.addClass(color)
  moth.css('left', Math.random() * 53 + 'vw')
  moth.css('top', Math.random() * 51 + 'vh')

  let mothID = ++globalId
  moth.attr('id', `moth-${mothID}`)
  if (hidden) moth.addClass('hidden')
  moths.push(new Moth(mothID, color))
  $('.moths').append(moth)
  return mothID
}

/**
 * Gets all light moths.
 * @return {Moth[]} a copy of `moths` containing all light moths.
 */
function getLightMoths () {
  return moths.filter(e => e.color === 'light')
}

/**
 * Gets all dark moths.
 * @return {Moth[]} a copy of `moths` containing all dark moths.
 */
function getDarkMoths () {
  return moths.filter(e => e.color === 'dark')
}

/**
 * Gets a moth HTML element by its ID number.
 * @param {number} number the ID number to fetch
 */
function getMothElById (number) {
  return $(`#moth-${number}`)
}

/**
 * Clears all moths from the simulation.
 */
function clearMoths () {
  $('.moths').empty()
  moths = []
}

/**
 * Resets the simulation to its initial state. Does *not* adjust bark type, voracity, phenotypes, or population;
 * instead, it is meant to be called after one of these settings is changed.
 */
function resetSimulation () {
  setTimeIndex(0)
  updateBark()
  clearMoths()
  clearCounts()
  setPlayButtonDisabled(true)
}

/**
 * Removes a moth from the array of stored moths.
 * @param {Number} id the ID of the moth to remove from the storage array.
 */
function deleteMothById (id) {
  moths.splice(moths.findIndex(e => e.id === id), 1)
}

/**
 * Executed after the simulation stops.
 */
function postStop () {
  setPlayButtonState(true)
  toggleControls(true)
  pendingStop = false
}

/**
 * Updates displayed numbers of moths.
 */
function updateCounts () {
  let lightCount = getLightMoths().length
  let darkCount = getDarkMoths().length
  let totalCount = moths.length
  $('#light-count').text(lightCount)
  $('#dark-count').text(darkCount)
  $('#total-count').text(totalCount)
}

/**
 * Clears displayed numbers of moths.
 */
function clearCounts () {
  $('#light-count').text('')
  $('#dark-count').text('')
  $('#total-count').text('')
}

/**
 * Sets whether the play button appears as a play icon or a pause icon.
 * @param {boolean} isPlay true for play, false for pause.
 */
function setPlayButtonState (isPlay) {
  $('#start-button i').text(isPlay ? 'play_arrow' : 'pause')
}

/**
 * Gets whether the play button appears as a play icon or a pause icon.
 */
function getPlayButtonState () {
  return $('#start-button i').text() === 'play_arrow'
}

/**
 * Sets the current time index using the range control.
 * @param {Number} index an integer on [0, 50] indicating the time index to set.
 */
function setTimeIndex (index) {
  $('#timeline').val(index)
}

/**
 * Disables/enables the start button.
 * @param {boolean} disable whether to disable the start button.
 */
function setPlayButtonDisabled (disable) {
  if (disable) {
    $('#start-button').addClass('disabled')
  } else {
    $('#start-button').removeClass('disabled')
  }
}

/**
 * Gets the current time index from the timeline range control.
 * @return {Number} the current time index.
 */
function getTimeIndex () {
  return parseInt($('#timeline').val())
}

/**
 * Enables or disables all controls.
 * @param {boolean} enable whether to enable the controls.
 */
function toggleControls (enable) {
  if (enable) {
    $('input, .moth-pop-adj, #mothify-button, #restart-button').prop('disabled', false).removeClass('disabled')
  } else {
    $('input, .moth-pop-adj, #mothify-button, #restart-button').prop('disabled', true).addClass('disabled')
  }
}

/**
 * Generates a random number in the range [min, max).
 * @param {Number} min the minimum of the range in which to generate a random number.
 * @param {Number} max the maximum of the range in which to generate a random number.
 */
function randInRange (min, max) {
  return Math.random() * (max - min) + min
}
