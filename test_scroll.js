  $effect(() => {
    if (activeSection) {
      const activeLink = document.querySelector(`a[href="#${activeSection}"]`);
      if (activeLink) {
        activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  });
