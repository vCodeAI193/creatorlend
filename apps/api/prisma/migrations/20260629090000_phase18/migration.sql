-- Phase 18 migration (already applied to DB by prior run)
-- F-601/602/603/606/610/615/651/652/660/701/710/715/720/751/755/760/762/801/810/815
-- ReviewVote, ArtistFaq, Collection, CollectionItem, WebhookDelivery, WebhookSubscription
-- + new fields on Review (artistReply, artistRepliedAt, votes)
-- + ArtistPost.isPinned
-- + Work.hasTranscript/hasAudioDescription/hasCaptions, collectionItems
-- + User.highContrast/fontSize/reducedMotion, faqs/collections/webhookSubscriptions
SELECT 1;
