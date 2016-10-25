function UnstableCtrl($scope, $rootScope, $timeout, $http) {
  $scope.count = 0;
  $scope.slowHttpPromiseStatus = 'fast http pending';
  $scope.routeChangeStatus = 'route change pending';
  $rootScope.$on('$routeChangeSuccess', function() {
    $scope.routeChangeStatus = 'route change done';
  });


  $http({method: 'GET', url: 'slowcall'}).success(function() {
    // intentionally empty
  }).then(function() {
    $scope.slowHttpPromiseStatus = 'fast http done';
  });

}
UnstableCtrl.$inject = ['$scope', '$rootScope', '$timeout', '$http'];
