// Obsługa przycisku 'Edytuj podgląd' – pokazuje sekcję wyboru slotu i przycisk 'Zapisz'
window.addEventListener('DOMContentLoaded', () => {
	const editBtn = document.getElementById('editProfilePreviewBtn');
	const selectorSection = document.getElementById('profilePreviewSelector');
	if (editBtn && selectorSection) {
		editBtn.addEventListener('click', () => {
			selectorSection.style.display = '';
			// Przewiń do sekcji wyboru slotu
			selectorSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}
});
// Obsługa przycisku zapisu slotu miniatury profilu
window.addEventListener('DOMContentLoaded', () => {
	const slotSaveBtn = document.getElementById('profileSlotSaveBtn');
	if (slotSaveBtn) {
		slotSaveBtn.addEventListener('click', async () => {
			const personId = appState.currentPersonId;
			// Znajdź wybrany slot (wybrana miniatura)
			const selectedFrame = document.querySelector('.profile-preview-frame.selected');
			if (!personId || !selectedFrame) {
				showError('Wybierz profil oraz slot miniatury do zapisu!');
				return;
			}
			const idx = Number(selectedFrame.dataset.index);
			const thumb = appState.thumbnails[idx];
			if (!thumb) {
				showError('Nie znaleziono danych miniatury!');
				return;
			}
			try {
				const response = await fetch(`/api/ml/person-profile/${encodeURIComponent(personId)}/preview-frame`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ slot_index: idx, thumbnail_base64: thumb.thumbnail })
				});
				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					showError('Błąd zapisu miniatury: ' + (err.error || response.status));
					return;
				}
				showSuccess('Miniatura profilu została zapisana!');
				updatePersonModelStatsPanel && updatePersonModelStatsPanel();
			} catch (err) {
				showError('Błąd zapisu miniatury: ' + err.message);
			}
		});
	}
});
// Obsługa zapisu aktualnej miniatury profilu (tylko zaawansowane)
window.addEventListener('DOMContentLoaded', () => {
	const advancedToggle = document.getElementById('profilesAdvancedToggle');
	const saveCurrentBtn = document.getElementById('profilePreviewSaveCurrentBtn');
	if (advancedToggle && saveCurrentBtn) {
		advancedToggle.addEventListener('change', (e) => {
			saveCurrentBtn.style.display = e.target.checked ? '' : 'none';
		});
		// Domyślnie ukryj
		saveCurrentBtn.style.display = advancedToggle.checked ? '' : 'none';
		saveCurrentBtn.addEventListener('click', async () => {
			const personId = appState.currentPersonId;
			// Znajdź wybraną miniaturę (pierwsza z .profile-preview-frame.selected)
			const selectedFrame = document.querySelector('.profile-preview-frame.selected');
			if (!personId || !selectedFrame) {
				showError('Wybierz profil oraz miniaturę do zapisu!');
				return;
			}
			const idx = Number(selectedFrame.dataset.index);
			const thumb = appState.thumbnails[idx];
			if (!thumb) {
				showError('Nie znaleziono danych miniatury!');
				return;
			}
			try {
				const response = await fetch(`/api/ml/person-profile/${encodeURIComponent(personId)}/preview-frame`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ slot_index: idx, thumbnail_base64: thumb.thumbnail })
				});
				if (!response.ok) {
					const err = await response.json().catch(() => ({}));
					showError('Błąd zapisu miniatury: ' + (err.error || response.status));
					return;
				}
				showSuccess('Aktualna miniatura profilu została zapisana!');
				updatePersonModelStatsPanel && updatePersonModelStatsPanel();
			} catch (err) {
				showError('Błąd zapisu miniatury: ' + err.message);
			}
		});
	}
});

// ...dalsza część kodu main.js (pełna kopia)...

