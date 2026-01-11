
        // Before/After Slider Functionality
        document.querySelectorAll('.comparison-container').forEach(container => {
            const handle = container.querySelector('.slider-handle');
            const sliderLine = container.querySelector('.slider-line');
            const imageAfter = container.querySelector('.image-after');
            let isDragging = false;

            function updateSlider(x) {
                const rect = container.getBoundingClientRect();
                const offsetX = x - rect.left;
                const percentage = Math.max(0, Math.min(100, (offsetX / rect.width) * 100));
                
                handle.style.left = percentage + '%';
                sliderLine.style.left = percentage + '%';
                imageAfter.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
            }

            // Mouse events
            container.addEventListener('mousedown', (e) => {
                isDragging = true;
                updateSlider(e.clientX);
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                updateSlider(e.clientX);
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });

            // Touch events for mobile
            container.addEventListener('touchstart', (e) => {
                isDragging = true;
                updateSlider(e.touches[0].clientX);
            });

            document.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                updateSlider(e.touches[0].clientX);
            });

            document.addEventListener('touchend', () => {
                isDragging = false;
            });

            // Click to position
            container.addEventListener('click', (e) => {
                if (e.target === handle) return;
                updateSlider(e.clientX);
            });
        });