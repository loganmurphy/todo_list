'use strict';
module.exports = (sequelize, DataTypes) => {
  var todo = sequelize.define('todo', {
    description: DataTypes.STRING,
    done: DataTypes.BOOLEAN,
    user_data: DataTypes.JSON
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return todo;
};