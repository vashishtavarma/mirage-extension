// Mock wink-nlp — returns empty entity list so NER never fires in unit tests
module.exports = () => ({
  readDoc: () => ({
    entities: () => ({ each: () => {} }),
  }),
  its: { type: 'type', value: 'value' },
});
