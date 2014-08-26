angular.module("app",[])
  .factory('api', function() {
    var _friends = [];
    for (var idx=0; idx < 25; ++idx) {
      var f = {id: idx, name: ('Friend ' + (idx+1)), strength: (idx/25)};
      _friends.push(f);   
    }
    var _added = {};
    var api = {};
    api.getFriendUpdates = function() {
      var actions = [];
      var n = Math.ceil(Math.random() / 0.25);
      for (var r=0; r < n; ++r) {
        var randIdx = Math.floor(Math.random() * _friends.length);
        var f = _friends[randIdx];
        var act = _added[f.id] ? 'remove' : 'add';
        actions.push({action:act, friend:f});
        if (act == 'add') _added[f.id] = true;
        else delete _added[f.id];
      }
      return actions;
    } 
    return api;   
  })
  .factory('friendCollection', function(alerts, $rootScope) {
    var _friends = [];
    var friendCollection = {};
    friendCollection.getFriends = function() {
      return _friends;
    };
    friendCollection.addFriend = function(friend) {
      _friends.push({
        info: friend,
        pendingRemoval: false
      });
      $rootScope.$emit('alert', {
        action: 'added',
        who: friend.name
      });
    };
    friendCollection.removeFriend = function(apifriend) {
      var removed = _.remove(_friends, function(friend) {
        return friend.info.id === apifriend.id;;
      });
      if (removed.length) {      
        $rootScope.$emit('alert', {
          action: 'removed',
          who: removed[0].info.name
        });
      };
    };
    friendCollection.toggleRemoval = function(index) {
      var action = _friends[index]['pendingRemoval'] ? 'toggleOff' : 'toggleOn'
      _friends[index]['pendingRemoval'] = !_friends[index]['pendingRemoval'];
      $rootScope.$emit('alert', {
        action: action,
        who: _friends[index]['info']['name']
      });
    };
    friendCollection.anyPendingRemoval = function() {
      return _.some(_friends, 'pendingRemoval');
    };
    friendCollection.purgePendingRemoval = function() {
      var removed = _.remove(_friends, 'pendingRemoval');
      _.each(removed, function(friend){
        $rootScope.$emit('alert', {
          action: 'purged',
          who: friend.info.name
        });
      });
    };
    return friendCollection;
  })
  .factory('alerts', function() {
    var _alerts = [];
    var alertsFactory = {};
    alertsFactory.getAlerts = function() {
      return _alerts;
    };
    alertsFactory.addAlerts = function(alert) {
      if(alert.who){        
        var needsPopping = _alerts.unshift({ type: alert.action, who: alert.who}) > 15; 
        if(needsPopping) {
          _alerts.pop();
        }
      }
    };
    alertsFactory.renderAlertText = function(alert) {
      var alertTypeDescriptions = {
        added: ' was added.',
        removed: ' was removed.',
        toggleOn: ' was scheduled for removal.',
        toggleOff: ' was unscheduled for removal.',
        purged: ' was purged.'
      };
      var output = [alert.who, alertTypeDescriptions[alert.type]].join(" ");
      return output; 
    }
    return alertsFactory;
  })
  .controller('friendCtrl', function($scope, $interval, api, friendCollection) {
    var actionHandlers = {
      add: friendCollection.addFriend, 
      remove: friendCollection.removeFriend
    };
    var apiFetchInterval = $interval(function(){
      _.each(api.getFriendUpdates(), function(item) {
        actionHandlers[item.action].call(this, item.friend);
      });
    }, 4000);

    $scope.friends = friendCollection.getFriends();
    $scope.toggleRemoval = friendCollection.toggleRemoval;
    $scope.anyPendingRemoval = friendCollection.anyPendingRemoval
    $scope.purgePendingRemoval = friendCollection.purgePendingRemoval;

    $scope.$on('$destroy', function() {
      $interval.cancel(apiFetchInterval);
    });
  })
  .controller('alertsCtrl', function($scope, $rootScope, alerts){
    $scope.alerts = alerts.getAlerts();
    $scope.renderAlertText = alerts.renderAlertText;
    $rootScope.$on('alert', function(e, alert){
      alerts.addAlerts(alert);
    });
  });