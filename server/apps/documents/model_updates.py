# Add these methods to the Document model in models.py

def save(self, *args, **kwargs):
    """Override save to populate year and search_text"""
    # Populate year from uploadDate
    if not self.year and self.uploadDate:
        self.year = self.uploadDate.year
    elif not self.year:
        from django.utils import timezone
        self.year = timezone.now().year
    
    # Populate search_text
    search_parts = [self.fileName]
    if self.description:
        search_parts.append(self.description)
    if self.tags:
        search_parts.extend(self.tags)
    if self.owner_name:
        search_parts.append(self.owner_name)
    if self.owner_id:
        search_parts.append(self.owner_id)
    
    self.search_text = ' '.join(search_parts).lower()
    
    super().save(*args, **kwargs)
