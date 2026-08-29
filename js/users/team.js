document.addEventListener("DOMContentLoaded", async () => {
    try {
        const apiUrl = window.location.origin + '/api/users/team.php';
        
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const result = await response.json();

        if (result.status === 'success' && Array.isArray(result.data)) {
            const containers = {
                bio: document.getElementById('science-biologists'),
                landscape: document.getElementById('engineering-landscape'),
                software: document.getElementById('it-software'),
                cs: document.getElementById('it-computer-science')
            };

            Object.values(containers).forEach(container => {
                if (container) container.innerHTML = '';
            });

            result.data.forEach(person => {
                const nameElement = document.createElement('p');
                nameElement.className = 'member-name';
                nameElement.textContent = person.username;

                // Normalize strings to lowercase and trim spaces for safe comparison
                const college = (person.college || '').trim().toLowerCase();
                const major = (person.major || '').trim().toLowerCase();

                if (college === 'college of science' && major === 'biology') {
                    containers.bio?.appendChild(nameElement);
                } 
                else if (college === 'college of engineering' && major === 'landscape architecture') {
                    containers.landscape?.appendChild(nameElement);
                } 
                else if (college === 'college of information technology' && major === 'software engineering') {
                    containers.software?.appendChild(nameElement);
                } 
                else if (college === 'college of information technology' && major === 'computer science') {
                    containers.cs?.appendChild(nameElement);
                }
            });
        }
    } catch (error) {
        console.error('Error loading team members:', error);
    }
});