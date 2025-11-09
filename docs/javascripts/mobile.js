// Mobile navigation improvements for DRIFT Documentation

document.addEventListener('DOMContentLoaded', function() {
  // Close sidebar when clicking on overlay
  const overlay = document.querySelector('.md-overlay');
  
  if (overlay) {
    overlay.addEventListener('click', function() {
      // Close primary sidebar (navigation)
      const drawerToggle = document.querySelector('[data-md-toggle="drawer"]');
      if (drawerToggle && drawerToggle.checked) {
        drawerToggle.checked = false;
      }
      
      // Close secondary sidebar (table of contents)
      const tocToggle = document.querySelector('[data-md-toggle="__toc"]');
      if (tocToggle && tocToggle.checked) {
        tocToggle.checked = false;
      }
    });
  }
  
  // Close sidebar when clicking on a navigation link (mobile only)
  if (window.innerWidth <= 1220) { // 76.25em in pixels
    const navLinks = document.querySelectorAll('.md-nav__link');
    
    navLinks.forEach(function(link) {
      link.addEventListener('click', function(e) {
        // Only close if it's an actual link (not a section toggle)
        if (link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
          setTimeout(function() {
            const drawerToggle = document.querySelector('[data-md-toggle="drawer"]');
            if (drawerToggle && drawerToggle.checked) {
              drawerToggle.checked = false;
            }
            
            const tocToggle = document.querySelector('[data-md-toggle="__toc"]');
            if (tocToggle && tocToggle.checked) {
              tocToggle.checked = false;
            }
          }, 100);
        }
      });
    });
  }
  
  // Prevent body scroll when sidebar is open on mobile
  const drawerToggle = document.querySelector('[data-md-toggle="drawer"]');
  const tocToggle = document.querySelector('[data-md-toggle="__toc"]');
  
  function toggleBodyScroll() {
    const isDrawerOpen = drawerToggle && drawerToggle.checked;
    const isTocOpen = tocToggle && tocToggle.checked;
    
    if (isDrawerOpen || isTocOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
  
  if (drawerToggle) {
    drawerToggle.addEventListener('change', toggleBodyScroll);
  }
  
  if (tocToggle) {
    tocToggle.addEventListener('change', toggleBodyScroll);
  }
  
  // Handle window resize
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Close sidebars when resizing to desktop
      if (window.innerWidth > 1220) {
        if (drawerToggle) drawerToggle.checked = false;
        if (tocToggle) tocToggle.checked = false;
        document.body.style.overflow = '';
      }
    }, 250);
  });
  
  // Improve touch scrolling on iOS
  const sidebars = document.querySelectorAll('.md-sidebar__scrollwrap');
  sidebars.forEach(function(sidebar) {
    sidebar.style.webkitOverflowScrolling = 'touch';
  });
});

