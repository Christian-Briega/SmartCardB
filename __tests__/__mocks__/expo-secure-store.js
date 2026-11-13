const store = new Map();

module.exports = {
  isAvailableAsync: jest.fn(async () => true),
  setItemAsync: jest.fn(async (key, value) => {
    store.set(key, value);
  }),
  getItemAsync: jest.fn(async (key) => store.get(key) || null),
  deleteItemAsync: jest.fn(async (key) => {
    store.delete(key);
  }),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  _clear: () => store.clear(),
};

