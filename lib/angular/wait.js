/**
 * Waits for all angular testabilities. Works with Angular 2, Angular 2,
 * and hybrid apps. Passes silently if there's no angular app on the page.
 *
 * Angular 1.2: use $browser.defer
 * Angular 1.3+: angular.getTestability
 * Angular 2: window.getAllAngularTestabilities
 *
 * This is executed in the context of the browser.
 *
 * Asynchronous.
 *
 * @param {string} rootSelector The selector housing an ng-app
 * @param {function(string)} callback callback. If a failure occurs, it will
 *     be passed as a parameter.
 */
exports.NG_WAIT_FN = function(rootSelector, callback) {
  "use strict";

  var el = document.querySelector(rootSelector);

  let oldNg1Wait = new Promise((resolve) => {
    if (window.angular && !window.angular.getTestability) {
      if (!window.angular.element(el).injector()) {
        throw new Error('root element (' + rootSelector + ') has no injector.' +
            ' this may mean it is not inside ng-app.');
      }
      window.angular.element(el)
          .injector()
          .get('$browser')
          .notifyWhenNoOutstandingRequests(resolve);
    } else {
      resolve();
    }
  });

  let ng1Wait = new Promise((resolve) => {
    if (window.angular && window.angular.getTestability) {
      window.angular.getTestability(el).whenStable(resolve);
    } else {
      resolve();
    }
  });

  let ng2Wait = new Promise((resolve) => {
    if (window.getAllAngularTestabilities) {
      let testabilities = window.getAllAngularTestabilities();
      let count = testabilities.length;

      let decrement = () => {
        count--;
        if (count === 0) {
          resolve();
        }
      };

      testabilities.forEach(function (testability) {
        testability.whenStable(decrement);
      });
    } else {
      resolve();
    }
  });

  Promise.all([oldNg1Wait, ng1Wait, ng2Wait])
      .then(() => callback())
      .catch((err) => {
        callback(err.message + err.stack);
      });
};

