"use strict";

var peopleEl = get('people');

try {
  if (localStorage && localStorage.getItem('split')) {
    var people = JSON.parse(localStorage.getItem('split'));
    people.forEach(function(person) {
      appendPerson(person[0], person[1]);
    });
    calculateSplits();
  } else {
    // Just start the page with a single person.
    appendPerson();
  }
} catch(e) {
  clearPage();
}

get('clear').addEventListener('click', function() {
  if (confirm('Are you sure?')) clearPage();
});

function sortPersonArray(arr, reverse) {
  if (reverse) {
    arr.sort(function(a,b) { return +(a.amount < b.amount) || +(a.amount === b.amount) - 1; });
  } else {
    arr.sort(function(a,b) { return +(a.amount > b.amount) || +(a.amount === b.amount) - 1; });
  }
}

function setSplitsShown(show) {
  get('splits').style.display = show ? 'block' : 'none';
}

function almostZero(amt) {
  return Math.abs(amt) <= 0.01;
}

function findMax(arr, prop) {
  var maxI = -1;
  var maxValue = 0;
  for (var i = 0; i < arr.length; i++) {
    var value = arr[i][prop];
    if (almostZero(value)) continue;
    if (value > maxValue) {
      maxValue = value;
      maxI = i;
    }
  }
  return i < 0 ? null : arr[maxI];
}

function calculateSplits() {
  var peopleEls = document.getElementsByClassName('person');
  // Too few people to calculate splits for.
  if (peopleEls.length < 3) {
    setSplitsShown(false);
    return;
  }

  var people = [];
  var total = 0;
  for (var i = 0, len = peopleEls.length; i < len; i++) {
    var name = peopleEls[i].childNodes[0].value;
    var amount = peopleEls[i].childNodes[1].value;
    if (name) {
      amount = parseFloat(amount.replace(/[^0-9|\.|\-]/g, ''), 10);
      if (isNaN(amount)) {
        amount = 0;
      }
      people.push({ name: name, amount: amount });
      total += amount;
    }
  }
  // Too few people to calculate splits for.
  if (people.length < 2) {
    setSplitsShown(false);
    return;
  }
  setSplitsShown(true);

  var average = total / people.length;
  var aboveAverage = [], belowAverage = [], atAverage = [];
  people.forEach(function(person) {
    if (almostZero(person.amount - average)) {
      atAverage.push(person);
    } else if (person.amount > average) {
      aboveAverage.push(person);
      person.owed = person.amount - average;
    } else {
      belowAverage.push(person);
      person.pays = [];
      person.owes = average - person.amount;
    }
  });

  sortPersonArray(aboveAverage, true);
  sortPersonArray(belowAverage, false);

  var payer;
  while (payer = findMax(belowAverage, 'owes')) {
    while (!almostZero(payer.owes)) {
      var toBePaid = findMax(aboveAverage, 'owed');
      if (!toBePaid) {
        console.error('payer still owed without anyone to pay', payer);
        break;
      }
      var paid = payer.owes > toBePaid.owed ? toBePaid.owed : payer.owes;
      payer.owes -= paid;
      toBePaid.owed -= paid;
      payer.pays.push({ name: toBePaid.name, amount: paid });
    }
  }

  // Output results.
  get('total-amount').innerText = '$' + total.toFixed(2);
  get('average-amount').innerText = '$' + average.toFixed(2);
  var splitPeople = get('split-people');
  emptyNode(splitPeople);
  belowAverage.forEach(function(person, i) {
    var owerWrapperEl = createElement('div', {'class': 'ower-wrapper'}, splitPeople);
    if (i % 2 == 0) {
      owerWrapperEl.classList.add('odd');
    }
    var owerEl = createElement('pre', {'class': 'ower'}, owerWrapperEl);
    var output = person.name + " owes\n";
    person.pays.forEach(function(person) {
      output += '    ' + person.name + ' $' + person.amount.toFixed(2) + "\n";
    });
    owerEl.innerText = output;
  });
}

function appendPerson(name, amount) {
  name = name || '';
  amount = amount || '';
  var personEl = createElement('div', {'class': 'person'}, peopleEl);
  var nameEl = createElement('input',
      {'class': 'name', type: 'text', value: name || '', placeholder: 'name'}, personEl);
  nameEl.addEventListener('keyup', function() {
    if (personEl.nextSibling || !nameEl.value.length) return;
    appendPerson();
  });
  var amountEl = createElement('input',
      {'class': 'amount', type: 'text', 'inputmode': 'numeric',
       value: amount || '', placeholder: 'amount'}, personEl);
  amountEl.addEventListener('keyup', function() {
    calculateSplits();
    delaySaveState();
  });
  amountEl.addEventListener('focus', function() { this.select(); });
}

var timer;
function delaySaveState() {
  clearTimeout(timer);
  timer = setTimeout(function() {
    var people = [];
    for (var i = 0, len = peopleEl.childNodes.length; i < len; i++) {
      var personEl = peopleEl.childNodes[i];
      people.push([personEl.childNodes[0].value, personEl.childNodes[1].value]);
    }
    try {
      localStorage.setItem('split', JSON.stringify(people));
    } catch(e) {}
  }, 1000);
}

function createElement(type, attrs, appendToEl) {
  var el = document.createElement(type);
  if (attrs) {
    for (var key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
  }
  if (appendToEl) {
    appendToEl.appendChild(el);
  }
  return el;
}

function clearPage() {
  emptyNode(peopleEl);
  appendPerson();
  calculateSplits();
  try {
    localStorage.removeItem('split');
  } catch(e) {}
}

function emptyNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function get(id) {
  return document.getElementById(id);
}
