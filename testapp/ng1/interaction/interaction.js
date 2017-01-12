function InteractionCtrl($scope, $window) {
  $scope.points = 1;
  $scope.fluxCapacitor = "off";

  $scope.toggleFlux = function() {
    if ($scope.fluxCapacitor == "off") {
      $scope.fluxCapacitor = "fluxing";
    } else {
      $scope.fluxCapacitor = "off";
    }
  };

  $scope.doAlert = function() {
    $window.alert('Hello');
  };
}

