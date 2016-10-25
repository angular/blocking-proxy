'use strict';


// Declare app level module which depends on filters, and services
angular.module('myApp', ['ngRoute', 'myApp.appVersion']).
  config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/async', {templateUrl: 'async/async.html', controller: AsyncCtrl});
    $routeProvider.when('/slowloader', {
      templateUrl: 'polling/polling.html',
      controller: PollingCtrl,
      resolve: {
        slow: function($timeout) {
          return $timeout(function() {}, 5000);
        }
      }
    });
    $routeProvider.otherwise({redirectTo: '/async'});
  }]);
