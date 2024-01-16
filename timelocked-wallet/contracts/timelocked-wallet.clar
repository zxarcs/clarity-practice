;; title: timelocked-wallet
;; summary: Simple wallet contract that unlocks at specific block height

;; constants
(define-constant owner tx-sender)

(define-constant err-only-owner (err u100)) ;; Somebody other than the contract owner called lock.
(define-constant err-already-locked (err u101)) ;; The contract owner tried to call lock more than once.
(define-constant err-block-in-past (err u102)) ;; The passed unlock height is in the past.
(define-constant err-zero-deposit (err u103)) ;; The owner called lock with an initial deposit of zero (u0).
(define-constant err-not-beneficiary (err u104)) ;; Somebody other than the beneficiary called claim, lock or bestow.
(define-constant err-too-soon (err u105)) ;; The beneficiary called claim but the unlock height has not yet been reached.

;; data vars
(define-data-var beneficiary (optional principal) none)
(define-data-var unlock-height uint u0)

;; public functions

;; Transfer some tokens from the tx-sender to itself and set the beneficiary and block height when withdraw opens.
;; Conditions:
;; Only the contract owner may call lock.
;; The wallet cannot be locked twice.
;; The passed unlock height should be at some point in the future.
;; Amount locked must be greater than zero
(define-public (lock (to-who principal) (unlock-at uint) (amount uint))
    (begin
        (asserts! (is-eq tx-sender owner) err-only-owner)
        (asserts! (is-none (var-get beneficiary)) err-already-locked)
        (asserts! (> unlock-at block-height) err-block-in-past)
        (asserts! (> amount u0) err-zero-deposit)
        (var-set beneficiary (some to-who))
        (var-set unlock-height unlock-at)
        (stx-transfer? amount tx-sender (as-contract tx-sender))
    )
)

;; Update the beneficiary
;; Conditions:
;; Only the current beneficiary can change the beneficiary
(define-public (bestow (new-beneficiary principal))
    (begin
        (asserts! (is-eq (some tx-sender) (var-get beneficiary)) err-not-beneficiary)
        (ok (var-set beneficiary (some new-beneficiary)))
    )
)

;; Claim funds
;; Conditions:
;; tx-sender is the beneficiary
;; unlock height has been reached
(define-public (claim)
    (begin 
        (asserts! (is-eq (some tx-sender) (var-get beneficiary)) err-not-beneficiary)
        (asserts! (>= block-height (var-get unlock-height)) err-too-soon)
        (as-contract (stx-transfer? (stx-get-balance tx-sender) tx-sender (unwrap-panic (var-get beneficiary))))
    )
)
