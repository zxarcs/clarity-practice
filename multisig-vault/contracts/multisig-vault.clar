;; title: multisig-vault
;; summary: a simplified DAO that allows its members to vote on which principal is allowed to
;; withdraw the DAO's token balance


;; constants
(define-constant owner tx-sender)

(define-constant err-only-owner (err u100))
(define-constant err-already-locked (err u101))
(define-constant err-more-votes-than-members-required (err u102))
(define-constant err-not-a-member (err u103))
(define-constant err-votes-required-not-met (err u104))
(define-constant err-zero-votes-required (err u105))

;; data vars

;; DAO members are stored in a list with a given maximum length.
(define-data-var members (list 100 principal) (list))
(define-data-var votes-required uint u1)

;; data maps

;; The votes are stored in a map that uses a tuple key with two values:
;;   * the principal of the member issuing the vote
;;   * the principal being voted for
(define-map votes {member: principal, recipient: principal} {decision: bool})

;; public functions
;; The start function is called by the contract owner to initialise the vault.
(define-public (start (new-members (list 100 principal)) (new-votes-required uint))
    (begin
        (asserts! (is-eq tx-sender owner) err-only-owner)
        (asserts! (is-eq (len (var-get members)) u0) err-already-locked)
        (asserts! (> (len new-members) new-votes-required) err-more-votes-than-members-required)
        (asserts! (> new-votes-required u0) err-zero-votes-required)
        (var-set members new-members)
        (var-set votes-required new-votes-required)
        (ok true)
    )
)

;; vote function checks that caller is one of the DAO members. This is done by using
;; index-of function. If it returns some value we know that the caller is a DAO member
(define-public (vote (for-who principal) (new-vote bool))
    (begin 
        (asserts! (is-some (index-of? (var-get members) tx-sender)) err-not-a-member)
        (ok (map-set votes {member:tx-sender, recipient: for-who} {decision: new-vote}))
    )
)

;; DAO member can withdraw funds once they get enough votes as identified by data var votes-required
(define-public (withdraw)
    (let
        (
            (recipient tx-sender)
            (total-votes-for-sender (count-all-votes-for-sender))
        )
        (asserts! (>= total-votes-for-sender (var-get votes-required)) err-votes-required-not-met)
        (as-contract (stx-transfer? (stx-get-balance tx-sender) tx-sender recipient))
    )
)

;; deposit function allows anyone to deposit funds to the contract. Not really necessary since
;; anyone can send funds directly to the contract principal anyways
(define-public (deposit (amount uint))
    (stx-transfer? amount tx-sender (as-contract tx-sender))
)

;; read only functions

;; retrieve a vote.
;; If a member never voted for a specific principal before, default to a negative vote of false.
(define-read-only (get-vote (member principal) (for-who principal))
    (default-to
        false
        (get decision 
            (map-get? votes {member: member, recipient: for-who})
        )
    )
)

;; count-all-votes-for-sender will use count-vote function to count votes for a DAO member
(define-read-only (count-all-votes-for-sender)
    (fold count-vote (var-get members) u0)
)

;; private functions

;; count-vote function returns accumulator+1 is true oterwise it returns the accumulator unchanged
(define-private (count-vote (member principal) (accumulator uint))
    (if (get-vote member tx-sender) (+ accumulator u1) accumulator)
)
