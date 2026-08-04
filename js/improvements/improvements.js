let locationsData = [];
        let currentIndex = 0;

        async function fetchImprovements() {
            try {
                let response = await fetch('../../api/improvments/improvments.php');
                let result = await response.json();
                if (result.success && result.data.length > 0) {
                    locationsData = result.data;
                    renderLocation(currentIndex);
                } else {
                    document.getElementById('slider-app').innerHTML = "<p>No location improvements found.</p>";
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            }
        }

        function renderLocation(index) {
            let loc = locationsData[index];
            document.getElementById('loc-name').innerText = loc.name.en;
            document.getElementById('loc-category').innerText = loc.category.toUpperCase();

            if (loc.project) {
                document.getElementById('proj-title').innerText = loc.project.title.en;
                document.getElementById('proj-desc').innerText = loc.project.description.en;
                document.getElementById('img-proposal').src = loc.project.image_proposal;
                document.getElementById('img-before').src = loc.project.image_before;
                document.getElementById('img-after').src = loc.project.image_after;
            } else {
                document.getElementById('proj-title').innerText = "No Active Projects";
                document.getElementById('proj-desc').innerText = "There are currently no registered projects for this location.";
                document.getElementById('img-proposal').src = "https://images.unsplash.com/photo-1541888946425-d0fbb18f86f6?auto=format&fit=crop&w=600&q=80";
                document.getElementById('img-before').src = "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80";
                document.getElementById('img-after').src = "https://images.unsplash.com/photo-1558449028-b53a39d100fc?auto=format&fit=crop&w=600&q=80";
            }
        }

        function nextLocation() {
            currentIndex = (currentIndex + 1) % locationsData.length;
            renderLocation(currentIndex);
        }

        fetchImprovements();