document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Dynamically build root-relative URL so it works in guest, admin, and creator views
        const apiUrl = window.location.origin + '/api/users/team.php';
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            // Map container IDs for easy reference and clean clearing
            const containers = {
                bio: document.getElementById('science-biologists'),
                landscape: document.getElementById('engineering-landscape'),
                software: document.getElementById('it-software'),
                cs: document.getElementById('it-computer-science')
            };

            // Clear existing contents safely if elements exist
            Object.values(containers).forEach(container => {
                if (container) container.innerHTML = '';
            });

            // Populate members
            result.data.forEach(person => {
                const nameElement = document.createElement('p');
                nameElement.className = 'member-name';
                nameElement.textContent = person.username;

                // Match college and major to the corresponding container
                if (person.college === 'College of Science' && person.major === 'Biology') {
                    containers.bio?.appendChild(nameElement);
                } 
                else if (person.college === 'College of Engineering' && person.major === 'Landscape Architecture') {
                    containers.landscape?.appendChild(nameElement);
                } 
                else if (person.college === 'College of Information Technology' && person.major === 'Software Engineering') {
                    containers.software?.appendChild(nameElement);
                } 
                else if (person.college === 'College of Information Technology' && person.major === 'Computer Science') {
                    containers.cs?.appendChild(nameElement);
                }
            });
        }
    } catch (error) {
        console.error('Error loading team members:', error);
    }
});