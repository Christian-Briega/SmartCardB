const React = require('react');

module.exports = {
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  StyleSheet: {
    create: (styles) => styles,
  },
  View: (props) => React.createElement('View', props, props.children),
  Text: (props) => React.createElement('Text', props, props.children),
  TouchableOpacity: (props) => React.createElement('TouchableOpacity', props, props.children),
  Pressable: (props) => React.createElement('Pressable', props, props.children),
  ScrollView: (props) => React.createElement('ScrollView', props, props.children),
  Animated: {
    Value: class {
      constructor(val) {
        this._val = val;
      }
      setValue(v) {
        this._val = v;
      }
    },
    spring: () => ({ start: (cb) => cb && cb() }),
    timing: () => ({ start: (cb) => cb && cb() }),
    sequence: (arr) => ({ start: (cb) => cb && cb() }),
    loop: (anim) => ({ start: () => {}, stop: () => {} }),
    View: (props) => React.createElement('Animated.View', props, props.children),
  },
};

