import useGameStore from '../store/gameStore'
import '../styles/confirm-modal.css'

function ConfirmModal() {
  const { confirmDialog, closeConfirmDialog } = useGameStore()

  if (!confirmDialog) return null

  const handleConfirm = () => {
    confirmDialog.onConfirm()
    closeConfirmDialog()
  }

  const handleCancel = () => {
    if (confirmDialog.onCancel) confirmDialog.onCancel()
    closeConfirmDialog()
  }

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <h2>{confirmDialog.title}</h2>
        <p>{confirmDialog.message}</p>
        <div className="confirm-modal-buttons">
          <button className="btn btn-confirm" onClick={handleConfirm}>
            Ja
          </button>
          <button className="btn btn-cancel" onClick={handleCancel}>
            Nein
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
