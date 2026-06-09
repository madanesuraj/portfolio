// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {

  // ==========================================================================
  // 1. Lenis Smooth Scroll Setup
  // ==========================================================================
  let lenis;
  
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom exponential easing
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: false,
      touchMultiplier: 2,
      infinite: false,
    });

    // Connect Lenis to requestAnimationFrame
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync GSAP ScrollTrigger with Lenis
    lenis.on('scroll', ScrollTrigger.update);
    
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    
    gsap.ticker.lagSmoothing(0);
  }

  // ==========================================================================
  // 2. Custom Cursor Follower with Damped Lerp
  // ==========================================================================
  const cursor = document.querySelector(".custom-cursor");
  const cursorDot = document.querySelector(".custom-cursor-dot");
  
  let mouseX = -100, mouseY = -100; // Start off-screen
  let cursorX = -100, cursorY = -100;
  let dotX = -100, dotY = -100;
  
  let targetScale = 1;
  let currentScale = 1;
  let targetDotScale = 1;
  let currentDotScale = 1;
  
  const lerp = (start, end, amt) => (1 - amt) * start + amt * end;
  
  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Flag to check if mouse has moved yet (prevents cursor from appearing in top-left on load)
  let mouseMoved = false;
  window.addEventListener("mousemove", () => {
    mouseMoved = true;
  }, { once: true });

  function animateCursor() {
    if (mouseMoved) {
      // Smooth position lerp (damped inertia)
      cursorX = lerp(cursorX, mouseX, 0.15);
      cursorY = lerp(cursorY, mouseY, 0.15);
      
      dotX = lerp(dotX, mouseX, 0.35); // Faster tracking for dot
      dotY = lerp(dotY, mouseY, 0.35);
      
      // Smooth scale lerp
      currentScale = lerp(currentScale, targetScale, 0.2);
      currentDotScale = lerp(currentDotScale, targetDotScale, 0.2);
      
      if (cursor) {
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%) scale(${currentScale})`;
        cursor.style.opacity = "1";
      }
      if (cursorDot) {
        cursorDot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%) scale(${currentDotScale})`;
        cursorDot.style.opacity = "1";
      }
    } else {
      // Keep hidden until first move
      if (cursor) cursor.style.opacity = "0";
      if (cursorDot) cursorDot.style.opacity = "0";
    }
    
    requestAnimationFrame(animateCursor);
  }
  
  // Only activate cursor tracking on non-touch screens (desktop)
  if (window.innerWidth > 767) {
    // Initialize positioning to center of screen before mouse moves
    cursorX = window.innerWidth / 2;
    cursorY = window.innerHeight / 2;
    dotX = cursorX;
    dotY = cursorY;
    
    animateCursor();
    
    // Select targets for scaling up cursor and hiding dot
    const scaleTargets = document.querySelectorAll("a, button, .filter-btn, .service-row-summary, .experience-row, .btn-talk, .btn-collaborate");
    scaleTargets.forEach(item => {
      item.addEventListener("mouseenter", () => {
        targetScale = 2.0;
        targetDotScale = 0;
        if (cursor) {
          cursor.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
          cursor.style.borderColor = "rgba(255, 255, 255, 0.3)";
          cursor.style.mixBlendMode = "difference";
        }
      });
      item.addEventListener("mouseleave", () => {
        targetScale = 1;
        targetDotScale = 1;
        if (cursor) {
          cursor.style.backgroundColor = "transparent";
          cursor.style.borderColor = "var(--color-dark)";
          cursor.style.mixBlendMode = "normal";
        }
      });
    });
    
    // Select targets where the cursor should disappear (e.g. project cards where we have a custom follow bubble)
    const hideTargets = document.querySelectorAll(".work-card-media");
    hideTargets.forEach(item => {
      item.addEventListener("mouseenter", () => {
        targetScale = 0;
        targetDotScale = 0;
      });
      item.addEventListener("mouseleave", () => {
        targetScale = 1;
        targetDotScale = 1;
      });
    });
  }

  // ==========================================================================
  // 3. Project Filter Logic (Selected Work)
  // ==========================================================================
  const filterButtons = document.querySelectorAll(".filter-btn");
  const workCards = document.querySelectorAll(".work-card");
  
  function filterProjects(filterValue, animate = true) {
    workCards.forEach(card => {
      const category = card.getAttribute("data-category");
      const matches = filterValue === "all" || category === filterValue;
      
      if (matches) {
        if (typeof gsap !== 'undefined') {
          gsap.killTweensOf(card);
        }
        
        card.style.display = "flex";
        
        if (animate && typeof gsap !== 'undefined') {
          gsap.fromTo(card, 
            { opacity: 0, scale: 0.96, y: 20 },
            { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "power2.out" }
          );
        } else {
          card.style.opacity = "1";
          card.style.transform = "scale(1) translateY(0)";
        }
      } else {
        if (animate && typeof gsap !== 'undefined') {
          gsap.killTweensOf(card);
          gsap.to(card, {
            opacity: 0,
            scale: 0.96,
            y: 20,
            duration: 0.3,
            ease: "power2.in",
            onComplete: () => {
              card.style.display = "none";
            }
          });
        } else {
          card.style.opacity = "0";
          card.style.transform = "scale(0.96) translateY(20px)";
          card.style.display = "none";
        }
      }
    });
    
    if (typeof ScrollTrigger !== 'undefined') {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 350);
    }
  }

  // Bind filter button click events
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      const filterValue = btn.getAttribute("data-filter");
      filterProjects(filterValue, true);
    });
  });

  // Run initial filter on load to display projects instantly
  const activeBtn = document.querySelector(".filter-btn.active");
  if (activeBtn) {
    const initialFilter = activeBtn.getAttribute("data-filter");
    filterProjects(initialFilter, false); // Display instantly on load without animation
  } else {
    filterProjects("all", false);
  }

  // ==========================================================================
  // 4. Project Card Mouse Hover Tracker (Circle Button Arrow ↗)
  // ==========================================================================
  const cardsMedia = document.querySelectorAll(".work-card-media");
  
  cardsMedia.forEach(media => {
    const indicator = media.querySelector(".work-hover-indicator");
    let rect = null;
    
    media.addEventListener("mouseenter", () => {
      rect = media.getBoundingClientRect();
    });
    
    media.addEventListener("mousemove", (e) => {
      if (!rect) {
        rect = media.getBoundingClientRect();
      }
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (indicator) {
        indicator.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    });
  });

  // ==========================================================================
  // 5. Services Accordion Logic (GSAP Smooth Height)
  // ==========================================================================
  const serviceItems = document.querySelectorAll(".service-item");
  
  serviceItems.forEach(item => {
    const summary = item.querySelector(".service-row-summary");
    const details = item.querySelector(".service-row-details");
    
    summary.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      
      // Close all other items first
      serviceItems.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains("active")) {
          otherItem.classList.remove("active");
          const otherDetails = otherItem.querySelector(".service-row-details");
          
          gsap.to(otherDetails, {
            height: 0,
            duration: 0.6,
            ease: "power3.inOut"
          });
        }
      });
      
      // Toggle target item
      if (isActive) {
        item.classList.remove("active");
        gsap.to(details, {
          height: 0,
          duration: 0.6,
          ease: "power3.inOut"
        });
      } else {
        item.classList.add("active");
        
        // Measure real height (auto fallback)
        gsap.set(details, { height: "auto" });
        const autoHeight = details.offsetHeight;
        gsap.set(details, { height: 0 });
        
        gsap.to(details, {
          height: autoHeight,
          duration: 0.6,
          ease: "power3.out",
          onComplete: () => {
            // Recalculate layout heights for scroll triggers
            ScrollTrigger.refresh();
          }
        });
      }
    });
  });

  // ==========================================================================
  // 6. Experience Row Hover tracking with 3D Tilt Card Follow
  // ==========================================================================
  const experienceSection = document.querySelector(".experience-section");
  const expRows = document.querySelectorAll(".experience-row");
  const floatingContainer = document.getElementById("exp-floating-container");
  const previewItems = document.querySelectorAll(".floating-preview-item");
  
  let targetFloatX = 0, targetFloatY = 0;
  let currentFloatX = 0, currentFloatY = 0;
  let activePreviewIndex = null;
  
  // Position floating card smoothly
  function animateFloatingCard() {
    currentFloatX = lerp(currentFloatX, targetFloatX, 0.15); // Faster lerp for lower latency
    currentFloatY = lerp(currentFloatY, targetFloatY, 0.15);
    
    if (floatingContainer) {
      floatingContainer.style.transform = `translate3d(${currentFloatX}px, ${currentFloatY}px, 0)`;
    }
    
    requestAnimationFrame(animateFloatingCard);
  }
  
  if (window.innerWidth > 767) {
    animateFloatingCard();
    
    expRows.forEach(row => {
      let rect = null;
      
      row.addEventListener("mouseenter", (e) => {
        const index = row.getAttribute("data-preview-index");
        activePreviewIndex = index;
        
        rect = row.getBoundingClientRect();
        
        // Make matching preview active
        previewItems.forEach(item => {
          if (item.getAttribute("data-index") === index) {
            item.classList.add("active");
          } else {
            item.classList.remove("active");
          }
        });
        
        floatingContainer.classList.add("visible");
        
        // Initial quick position
        targetFloatX = e.clientX + 25;
        targetFloatY = e.clientY + 25;
        currentFloatX = targetFloatX;
        currentFloatY = targetFloatY;
      });
      
      row.addEventListener("mousemove", (e) => {
        // Update target position (floating card tracks mouse)
        targetFloatX = e.clientX + 25;
        targetFloatY = e.clientY + 25;
        
        if (!rect) {
          rect = row.getBoundingClientRect();
        }
        
        // Calculate relative position within the hovered row for 3D tilt
        const mouseXInRow = e.clientX - rect.left;
        const mouseYInRow = e.clientY - rect.top;
        
        // Map relative coordinates to a tilt value (-15 to 15 degrees)
        const tiltY = ((mouseXInRow / rect.width) - 0.5) * 30; // rotation around Y-axis
        const tiltX = -((mouseYInRow / rect.height) - 0.5) * 30; // rotation around X-axis
        
        // Apply 3D rotation to the active preview element
        const activePreview = floatingContainer.querySelector(`.floating-preview-item[data-index="${activePreviewIndex}"] .floating-mockup-inner, .floating-preview-item[data-index="${activePreviewIndex}"] .floating-preview-item-inner`);
        if (activePreview) {
          activePreview.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.06)`;
        }
      });
      
      row.addEventListener("mouseleave", () => {
        floatingContainer.classList.remove("visible");
        
        // Reset 3D transform on leave
        if (activePreviewIndex) {
          const activePreview = floatingContainer.querySelector(`.floating-preview-item[data-index="${activePreviewIndex}"] .floating-mockup-inner, .floating-preview-item[data-index="${activePreviewIndex}"] .floating-preview-item-inner`);
          if (activePreview) {
            activePreview.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
          }
        }
        
        activePreviewIndex = null;
        rect = null;
      });
    });
  }


  // ==========================================================================
  // 7. GSAP ScrollTrigger Reveal Animations
  // ==========================================================================

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    
    // Page load hero animations
    const tlHero = gsap.timeline({
      onComplete: () => {
        initHeroInteractions();
      }
    });
    
    tlHero.from(".navbar", {
      y: -50,
      opacity: 0,
      duration: 1,
      ease: "power4.out"
    })
    .from(".hero-bg-text span", {
      y: 120,
      opacity: 0,
      duration: 1.4,
      stagger: 0.15,
      ease: "power4.out"
    }, "-=0.6")
    .from(".hero-image", {
      y: 100,
      opacity: 0,
      duration: 1.6,
      ease: "power4.out"
    }, "-=1.0")
    .from(".hero-bio > *", {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    }, "-=0.6")
    .from(".hero-socials-sidebar > *", {
      x: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.08,
      ease: "power3.out"
    }, "-=0.8");

    // Parallax Scroll for Background Text on Scroll
    gsap.to(".hero-bg-text", {
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom top",
        scrub: true
      },
      yPercent: -20,
      ease: "none"
    });

    // Fade out and translate socials on scroll down (parallax / subtle reveal)
    gsap.to(".hero-socials-sidebar", {
      scrollTrigger: {
        trigger: "#hero",
        start: "top top",
        end: "bottom center",
        scrub: true
      },
      opacity: 0,
      y: 40,
      ease: "none"
    });

    // 3D Mouse Tilt on Portrait and Inverse Parallax on Name on Mousemove
    function initHeroInteractions() {
      const heroImg = document.querySelector(".hero-image");
      const heroText = document.querySelector(".hero-bg-text");
      const heroImgContainer = document.querySelector(".hero-image-container");
  
      if (window.innerWidth > 767 && heroImg && heroText && heroImgContainer) {
        // Initialize Canvas for pixel-aware hover detection
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let imgData = null;
        let pixels = null;
        const canvasW = 300; // Resolution of 300px wide for high precision
        let canvasH = 240;   // Will be dynamically updated based on image aspect ratio
        
        function updateCanvasData() {
          try {
            if (heroImg.complete && heroImg.naturalWidth > 0) {
              const naturalRatio = heroImg.naturalWidth / heroImg.naturalHeight;
              canvasH = Math.round(canvasW / naturalRatio);
              canvas.width = canvasW;
              canvas.height = canvasH;
              
              ctx.clearRect(0, 0, canvasW, canvasH);
              ctx.drawImage(heroImg, 0, 0, canvasW, canvasH);
              imgData = ctx.getImageData(0, 0, canvasW, canvasH);
              pixels = imgData.data;
            } else {
              heroImg.addEventListener("load", () => {
                const naturalRatio = heroImg.naturalWidth / heroImg.naturalHeight;
                canvasH = Math.round(canvasW / naturalRatio);
                canvas.width = canvasW;
                canvas.height = canvasH;
                
                ctx.clearRect(0, 0, canvasW, canvasH);
                ctx.drawImage(heroImg, 0, 0, canvasW, canvasH);
                imgData = ctx.getImageData(0, 0, canvasW, canvasH);
                pixels = imgData.data;
              });
            }
          } catch (e) {
            console.warn("Pixel-aware hover disabled due to CORS/Origin policy: ", e.message);
          }
        }
  
        updateCanvasData();
  
        // Check if cursor is over the opaque character pixels using a stable reference coordinate system
        function isOverPerson(clientX, clientY) {
          if (!pixels) return false;
          
          // Get the bounding client rect of the stable, un-transformed container
          const rect = heroImgContainer.getBoundingClientRect();
          if (!rect.width || !rect.height) return false;
          
          const naturalWidth = heroImg.naturalWidth;
          const naturalHeight = heroImg.naturalHeight;
          if (!naturalWidth || !naturalHeight) return false;
          
          const imgRatio = naturalWidth / naturalHeight;
          const containerRatio = rect.width / rect.height;
          
          let renderWidth, renderHeight, renderLeft, renderTop;
          
          // Compute the exact coordinates of the rendered image within the container,
          // accounting for object-fit: contain (pillarbox or letterbox)
          if (containerRatio > imgRatio) {
            // Container is wider than the image aspect ratio (pillarbox)
            renderHeight = rect.height;
            renderWidth = rect.height * imgRatio;
            renderLeft = rect.left + (rect.width - renderWidth) / 2;
            renderTop = rect.top;
          } else {
            // Container is taller than the image aspect ratio (letterbox)
            renderWidth = rect.width;
            renderHeight = rect.width / imgRatio;
            renderLeft = rect.left;
            renderTop = rect.top + (rect.height - renderHeight) / 2;
          }
          
          const x = clientX - renderLeft;
          const y = clientY - renderTop;
          
          // Check if coordinates are within the actual rendered image boundaries
          if (x >= 0 && x < renderWidth && y >= 0 && y < renderHeight) {
            // Map the coordinates to the offscreen canvas
            const canvasX = Math.floor((x / renderWidth) * canvasW);
            const canvasY = Math.floor((y / renderHeight) * canvasH);
            
            if (canvasX >= 0 && canvasX < canvasW && canvasY >= 0 && canvasY < canvasH) {
              const pixelIndex = (canvasY * canvasW + canvasX) * 4;
              const alpha = pixels[pixelIndex + 3];
              return alpha > 15; // Threshold check (alpha > 15 means opaque body pixel)
            }
          }
          return false;
        }
  
        function resetHeroImg() {
          gsap.to(heroImg, {
            x: 0,
            y: 0,
            rotationY: 0,
            rotationX: 0,
            scale: 1,
            duration: 1.4,
            ease: "power3.out",
            overwrite: "auto"
          });
    
          gsap.to(heroText, {
            x: 0,
            y: 0,
            duration: 1.4,
            ease: "power3.out",
            overwrite: "auto"
          });
          
          heroImg.classList.remove("portrait-active");
        }
  
        // Track mouse globally on window to prevent dead zones from overlays
        window.addEventListener("mousemove", (e) => {
          // Guard: Only run if the hero section is in view
          if (window.scrollY > window.innerHeight) return;
    
          const isHovered = isOverPerson(e.clientX, e.clientY);
  
          if (isHovered) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const x = e.clientX / w - 0.5; // -0.5 to 0.5
            const y = e.clientY / h - 0.5; // -0.5 to 0.5
      
            // Smoothly rotate and translate the portrait image (3D Tilt)
            gsap.to(heroImg, {
              x: x * 30,
              y: y * 20,
              rotationY: x * 10,
              rotationX: -y * 10,
              scale: 1.03, // Subtle scale-up on interaction
              duration: 1.2,
              ease: "power3.out",
              overwrite: "auto"
            });
      
            // Move the background text in the opposite direction (Inverse Parallax)
            gsap.to(heroText, {
              x: -x * 50,
              y: -y * 30,
              duration: 1.2,
              ease: "power3.out",
              overwrite: "auto"
            });
  
            // Turn portrait color
            heroImg.classList.add("portrait-active");
          } else {
            resetHeroImg();
          }
        });
    
        // Reset transforms when mouse leaves the browser window
        document.addEventListener("mouseleave", () => {
          resetHeroImg();
        });
  
        // Reset transforms when user scrolls past the hero section
        window.addEventListener("scroll", () => {
          if (window.scrollY > window.innerHeight * 0.5) {
            resetHeroImg();
          }
        });
      }
    }

    // Scroll trigger reveals for section headers
    const sections = document.querySelectorAll(".section");
    
    sections.forEach(sec => {
      const bgTitle = sec.querySelector(".section-bg-title");
      const title = sec.querySelector(".section-title");
      
      if (bgTitle && title) {
        gsap.from(bgTitle, {
          scrollTrigger: {
            trigger: sec,
            start: "top 80%",
            toggleActions: "play none none none"
          },
          y: 40,
          opacity: 0,
          duration: 1.2,
          ease: "power3.out"
        });
        
        gsap.from(title, {
          scrollTrigger: {
            trigger: sec,
            start: "top 82%",
            toggleActions: "play none none none"
          },
          x: -30,
          opacity: 0,
          duration: 1,
          ease: "power3.out"
        });
      }
    });

    // Reveal project grid cards on scroll
    gsap.fromTo(".work-card", 
      { opacity: 0, y: 60 },
      {
        scrollTrigger: {
          trigger: ".work-grid",
          start: "top 80%"
        },
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
        clearProps: "opacity,transform" // Clear inline styles so filtering works clean!
      }
    );

    // Reveal service accordion items
    gsap.from(".service-item", {
      scrollTrigger: {
        trigger: ".services-list",
        start: "top 80%"
      },
      y: 40,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out"
    });

    // Reveal experience timeline rows
    gsap.from(".experience-row", {
      scrollTrigger: {
        trigger: ".experience-timeline",
        start: "top 82%"
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power3.out"
    });
  }
});
