const observer = new MutationObserver(mutationsList => {
  for (const mutation of mutationsList) {
    console.group(`Mutation type: ${mutation.type}`);
    if (mutation.type === 'childList') {
      console.log('Added nodes:', mutation.addedNodes);
      console.log('Removed nodes:', mutation.removedNodes);
    } else if (mutation.type === 'attributes') {
      console.log(`Attribute changed: ${mutation.attributeName}`);
    } else if (mutation.type === 'characterData') {
      console.log('Text content changed:', mutation.target.data);
    }
    console.groupEnd();
  }
});

export function observeMutations() {
  observer.observe(document.body, {
    childList: true, // Observe direct child node changes
    attributes: true, // Observe attribute changes
    subtree: true, // Observe all descendants
    characterData: true, // Observe text content changes
    characterDataOldValue: true,
    attributeOldValue: true,
  });

  return () => {
    observer.disconnect();
  };
}
