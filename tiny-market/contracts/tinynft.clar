;; title: tinynft
;; summary: NFT that tiny market works with

;; traits
(impl-trait 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.nft-trait.nft-trait)

;; token definitions
(define-non-fungible-token tinynft uint)

;; constants
(define-constant owner tx-sender)
(define-constant err-only-owner (err u100))
(define-constant err-not-token-owner (err u101))

;; data vars
(define-data-var last-token-id uint u0)

;; public functions
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (nft-transfer? tinynft token-id sender recipient)
    )
)

(define-public (mint (recipient principal))
    (let 
        (
            (new-token-id (+ (var-get last-token-id) u1))
        )
        (asserts! (is-eq tx-sender owner) err-only-owner)
        (try! (nft-mint? tinynft new-token-id recipient))
        (var-set last-token-id new-token-id)
        (ok new-token-id)
    )
)

;; read only functions
(define-read-only (get-last-token-id)
    (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok none)
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? tinynft token-id))
)
